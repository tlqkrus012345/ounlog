import { test, expect, type Page } from '@playwright/test'

const expiredCopy = '로그인이 만료되었습니다. 다시 로그인해 주세요.'
const resumeCopy = '입력한 내용을 확인한 뒤 분석을 다시 실행해 주세요.'
const otherKey = 'ounlog-recovery:other-work'
const otherRecord = {
  version: 1,
  id: 'other-work',
  workId: 'other-work-id',
  ownerMemberId: '1',
  targetPath: '/saju/confirm',
  createdAt: 0,
  input: {
    birthDate: '1995-03-21',
    birthTime: '14:30',
    calendarType: 'SOLAR',
    gender: 'MALE',
    isLeapMonth: false,
  },
}
async function submit(page: Page, password = 'password123') {
  await page.getByLabel('이메일', { exact: true }).fill('member@example.com')
  await page.getByLabel('비밀번호', { exact: true }).fill(password)
  await page.getByRole('button', { name: '로그인', exact: true }).click()
}
async function expectLogin(page: Page, expired: boolean) {
  await expect(page).toHaveURL('/login')
  await expect(page.getByLabel('이메일', { exact: true })).toBeVisible()
  if (expired) await expect(page.getByText(expiredCopy)).toBeVisible()
  else await expect(page.getByText(expiredCopy)).toHaveCount(0)
}
test.beforeEach(async ({ request }) => {
  await request.post('/__test/reset')
})

for (const code of [
  'SESSION_EXPIRED',
  'SESSION_INVALID',
  'AUTHENTICATION_REQUIRED',
]) {
  for (const withOther of [false, true]) {
    test(`복구 자료 없는 재접속: ${code}, 다른 작업 ${withOther ? '있음' : '없음'}`, async ({
      page,
      context,
      request,
    }) => {
      if (code === 'SESSION_EXPIRED') {
        await page.goto('/login')
        await submit(page)
        await expect(page).toHaveURL('/entry')
        await request.post('/__test/expire-session')
      } else {
        await page.goto('/entry')
        await expect(
          page.getByRole('button', { name: '로그인하기' }),
        ).toBeVisible()
        if (code === 'SESSION_INVALID')
          await context.addCookies([
            {
              name: 'ounlog_refresh',
              value: 'unknown-test-session',
              domain: 'localhost',
              path: '/v1/auth',
              httpOnly: true,
              secure: true,
              sameSite: 'Lax',
              expires: Date.now() / 1000 + 3600,
            },
          ])
        else await context.clearCookies()
      }
      const record = { ...otherRecord, createdAt: Date.now() }
      await page.evaluate(
        ({ withOther, record, otherKey }) => {
          sessionStorage.clear()
          localStorage.clear()
          if (withOther) localStorage.setItem(otherKey, JSON.stringify(record))
        },
        { withOther, record, otherKey },
      )
      await page.goto('about:blank')
      const reconnected = await context.newPage()
      let analysisRequests = 0
      reconnected.on('request', (r) => {
        if (r.url().endsWith('/v1/saju/analysis')) analysisRequests++
      })
      const initial = reconnected.waitForResponse((r) =>
        r.url().endsWith('/v1/auth/refresh'),
      )
      await reconnected.goto('/saju/analysis')
      expect((await (await initial).json()).code).toBe(code)
      const expired = code !== 'AUTHENTICATION_REQUIRED'
      await expectLogin(reconnected, expired)

      await submit(reconnected, 'wrong-password')
      await expect(reconnected.getByRole('alert')).toHaveText(
        '이메일 또는 비밀번호가 올바르지 않거나 로그인이 일시적으로 제한되었습니다.',
      )
      await expectLogin(reconnected, expired)
      await reconnected.reload()
      await expectLogin(reconnected, expired)
      await expect(
        reconnected.getByLabel('이메일', { exact: true }),
      ).toHaveValue('')
      await submit(reconnected)
      await expect(reconnected).toHaveURL('/entry')
      await expect(reconnected.getByText(resumeCopy)).toHaveCount(0)
      await expect(
        reconnected.getByText(record.input.birthDate, { exact: true }),
      ).toHaveCount(0)
      expect(
        await reconnected.evaluate(() => sessionStorage.getItem('saju-form')),
      ).toBeNull()
      const retained = await reconnected.evaluate(
        (key) => localStorage.getItem(key),
        otherKey,
      )
      expect(retained).toBe(withOther ? JSON.stringify(record) : null)
      expect(analysisRequests).toBe(0)
      expect(
        (await (await request.get('/__test/stats')).json()).analysisAttempts,
      ).toBe(0)
    })
  }
}

for (const failure of ['record-write', 'legacy-draft']) {
  test(`복구 생성의 ${failure} 실패도 만료 안내 후 재로그인한다`, async ({
    page,
    request,
  }) => {
    await page.goto('/login')
    await submit(page)
    await expect(page).toHaveURL('/entry')
    const record = {
      ...otherRecord,
      targetPath: '/saju/birth-time',
      createdAt: Date.now(),
    }
    await page.evaluate(
      ({ record, otherKey, failure }) => {
        localStorage.setItem(otherKey, JSON.stringify(record))
        sessionStorage.setItem('ounlog-recovery-current', record.id)
        sessionStorage.setItem(
          'saju-form',
          JSON.stringify({
            input: { ...record.input, birthDate: '2000-01-01' },
            ownerMemberId: '1',
            ...(failure === 'legacy-draft'
              ? {}
              : { workId: 'current-work-id' }),
          }),
        )
      },
      { record, otherKey, failure },
    )
    await request.post('/__test/expire-session')
    await page.addInitScript((failure) => {
      const setItem = Storage.prototype.setItem
      Storage.prototype.setItem = function (key, value) {
        if (
          (failure === 'legacy-draft' &&
            this === sessionStorage &&
            key === 'saju-form') ||
          (failure === 'record-write' &&
            this === localStorage &&
            key.startsWith('ounlog-recovery:'))
        )
          throw new DOMException('full', 'QuotaExceededError')
        setItem.call(this, key, value)
      }
    }, failure)
    await page.goto('/saju/confirm')
    await expectLogin(page, true)
    await expect(page.getByText('2000-01-01', { exact: true })).toHaveCount(0)
    await submit(page)
    await expect(page).toHaveURL('/entry')
    expect(
      await page.evaluate(() => sessionStorage.getItem('saju-form')),
    ).toBeNull()
    expect(
      await page.evaluate((key) => localStorage.getItem(key), otherKey),
    ).toBe(JSON.stringify(record))
    expect(
      (await (await request.get('/__test/stats')).json()).analysisAttempts,
    ).toBe(0)
  })
}
