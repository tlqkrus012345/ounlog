import { test, expect, type Page } from '@playwright/test'

function deferred() {
  let resolve!: () => void
  const promise = new Promise<void>((done) => {
    resolve = done
  })
  return { promise, resolve }
}
async function fill(page: Page, email = 'member@example.com') {
  await page.getByLabel('이메일', { exact: true }).fill(email)
  await page.getByLabel('비밀번호', { exact: true }).fill('password123')
}
async function login(page: Page) {
  await page.goto('/login')
  await fill(page)
  await page.getByRole('button', { name: '로그인', exact: true }).click()
  await expect(page).toHaveURL('/entry')
  await expect(
    page.getByRole('button', { name: '로그아웃', exact: true }),
  ).toBeVisible()
}
async function painted(page: Page) {
  await page.evaluate(
    () =>
      new Promise<void>((done) =>
        requestAnimationFrame(() => requestAnimationFrame(() => done())),
      ),
  )
}
test.beforeEach(async ({ request }) => {
  await request.post('/__test/reset')
})

for (const outcome of ['success', 'failure'] as const) {
  test(`로그인 중 재진입한 폼은 이전 ${outcome} 요청의 결과를 새 제출에 공유하지 않는다`, async ({
    page,
  }) => {
    await page.goto('/entry')
    await page.getByRole('button', { name: '로그인하기' }).click()
    const release = deferred()
    const started = deferred()
    const emails: string[] = []
    await page.route('**/v1/auth/login', async (route) => {
      emails.push(route.request().postDataJSON().email)
      if (emails.length !== 1) return route.continue()
      const response = outcome === 'success' ? await route.fetch() : null
      started.resolve()
      await release.promise
      if (response) await route.fulfill({ response })
      else
        await route.fulfill({
          status: 401,
          json: {
            status: 401,
            code: 'INVALID_CREDENTIALS',
            message: 'rejected',
            path: '/v1/auth/login',
            timestamp: new Date().toISOString(),
          },
        })
    })
    try {
      await fill(page)
      await page.getByRole('button', { name: '로그인', exact: true }).click()
      await started.promise
      await page.goBack()
      await expect(page).toHaveURL('/entry')
      await page.getByRole('button', { name: '로그인하기' }).click()
      await expect(
        page.getByRole('button', { name: '로그인 중...', exact: true }),
      ).toBeDisabled()
      await expect(page.getByLabel('이메일', { exact: true })).toHaveValue('')
      await expect(
        page.getByLabel('이메일', { exact: true }),
      ).not.toBeEditable()
      await page
        .locator('form')
        .evaluate((form: HTMLFormElement) => form.requestSubmit())
      const response = page.waitForResponse((r) =>
        r.url().endsWith('/v1/auth/login'),
      )
      release.resolve()
      await (await response).finished()
      if (outcome === 'success') await expect(page).toHaveURL('/entry')
      else {
        await expect(
          page.getByRole('button', { name: '로그인', exact: true }),
        ).toBeEnabled()
        await expect(page.getByRole('alert')).toHaveCount(0)
        await fill(page, 'other@example.com')
        const next = page.waitForResponse((r) =>
          r.url().endsWith('/v1/auth/login'),
        )
        await page.getByRole('button', { name: '로그인', exact: true }).click()
        expect((await (await next).json()).session.memberId).toBe('2')
        await expect(page).toHaveURL('/entry')
      }
      expect(emails).toEqual(
        outcome === 'success'
          ? ['member@example.com']
          : ['member@example.com', 'other@example.com'],
      )
    } finally {
      release.resolve()
    }
  })
}

for (const kind of ['logout-start', 'logout-success', 'logout-error']) {
  test(`새 로그인 후 지연된 ${kind} 알림은 현재 입력과 복구 기록을 삭제하지 않는다`, async ({
    page,
  }) => {
    await login(page)
    await page.getByRole('button', { name: /^사주/ }).click()
    await page.getByLabel('생년월일').fill('1995-03-21')
    const before = await page.evaluate(() => {
      localStorage.setItem(
        'ounlog-recovery:current-work',
        JSON.stringify({
          version: 1,
          id: 'current-work',
          ownerMemberId: '1',
          targetPath: '/saju/confirm',
          createdAt: Date.now(),
          input: {
            birthDate: '1995-03-21',
            birthTime: '14:30',
            calendarType: 'SOLAR',
            gender: 'MALE',
            isLeapMonth: false,
          },
        }),
      )
      return {
        draft: sessionStorage.getItem('saju-form'),
        record: localStorage.getItem('ounlog-recovery:current-work'),
        event: localStorage.getItem('ounlog-auth-event'),
      }
    })
    await page.evaluate(async (kind) => {
      const event = { id: 'old-' + kind, kind }
      window.dispatchEvent(
        new StorageEvent('storage', {
          key: 'ounlog-auth-event',
          newValue: JSON.stringify(event),
        }),
      )
      const channel = new BroadcastChannel('ounlog-auth')
      channel.postMessage(event)
      await new Promise<void>((done) =>
        requestAnimationFrame(() => requestAnimationFrame(() => done())),
      )
      channel.close()
    }, kind)
    await painted(page)
    await expect(page.getByLabel('생년월일')).toHaveValue('1995-03-21')
    const after = await page.evaluate(() => ({
      draft: sessionStorage.getItem('saju-form'),
      record: localStorage.getItem('ounlog-recovery:current-work'),
      event: localStorage.getItem('ounlog-auth-event'),
    }))
    expect(after).toEqual(before)
  })
}

for (const scenario of [
  'same-member',
  'other-member',
  'ambiguous',
  'expired',
  'damaged',
  'incomplete',
  'none',
  'path-selected',
]) {
  test(`Cookie와 sessionStorage 없는 원래 경로 재접속: ${scenario}`, async ({
    page,
    context,
    request,
  }) => {
    await page.goto('/entry')
    await expect(page.getByRole('button', { name: '로그인하기' })).toBeVisible()
    await page.evaluate((scenario) => {
      sessionStorage.clear()
      if (scenario === 'none') return
      const record = {
        version: 1,
        id: 'original-task',
        ownerMemberId: '1',
        targetPath: '/saju/confirm',
        createdAt: Date.now(),
        input: {
          birthDate: '1995-03-21',
          birthTime: '14:30',
          calendarType: 'SOLAR',
          gender: 'MALE',
          isLeapMonth: false,
        },
      }
      if (scenario === 'expired') record.createdAt -= 24 * 3600_000
      if (scenario === 'damaged') record.input.birthDate = '2026-02-30'
      localStorage.setItem(
        'ounlog-recovery:' + record.id,
        JSON.stringify(
          scenario === 'incomplete'
            ? { ...record, input: { birthDate: record.input.birthDate } }
            : record,
        ),
      )
      if (scenario === 'ambiguous' || scenario === 'path-selected') {
        const other = {
          ...record,
          id: 'other-task',
          targetPath:
            scenario === 'ambiguous' ? '/saju/confirm' : '/saju/birth-time',
          input: { ...record.input, birthDate: '2000-01-01' },
        }
        localStorage.setItem(
          'ounlog-recovery:' + other.id,
          JSON.stringify(other),
        )
      }
    }, scenario)
    await context.clearCookies()
    await page.goto('about:blank')
    const returned = await context.newPage()
    await returned.goto('/saju/confirm')
    if (['ambiguous', 'expired', 'damaged', 'incomplete'].includes(scenario)) {
      await expect(returned).toHaveURL('/entry')
      expect(
        await returned.evaluate(() =>
          Object.keys(localStorage).filter((k) =>
            k.startsWith('ounlog-recovery:'),
          ),
        ),
      ).toHaveLength(0)
    } else if (scenario === 'none') {
      await expect(returned).toHaveURL('/saju')
      await expect(returned.getByLabel('생년월일')).toHaveValue('')
    } else {
      await expect(returned).toHaveURL('/login')
      if (scenario === 'path-selected') await returned.reload()
      await expect(returned.getByLabel('이메일', { exact: true })).toBeVisible()
      await expect(
        returned.getByText('1995-03-21', { exact: true }),
      ).toHaveCount(0)
      expect(
        await returned.evaluate(() => sessionStorage.getItem('saju-form')),
      ).toBeNull()
      await fill(
        returned,
        scenario === 'other-member'
          ? 'other@example.com'
          : 'member@example.com',
      )
      await returned
        .getByRole('button', { name: '로그인', exact: true })
        .click()
      await expect(returned).toHaveURL(
        scenario === 'other-member' ? '/entry' : '/saju/confirm',
      )
      if (scenario === 'other-member') {
        expect(
          await returned.evaluate(() => sessionStorage.getItem('saju-form')),
        ).toBeNull()
        expect(
          await returned.evaluate(() =>
            Object.keys(localStorage).filter((k) =>
              k.startsWith('ounlog-recovery:'),
            ),
          ),
        ).toHaveLength(0)
      } else {
        await expect(
          returned.getByText('1995-03-21', { exact: true }),
        ).toBeVisible()
        expect(
          await returned.evaluate(() =>
            localStorage.getItem('ounlog-recovery:original-task'),
          ),
        ).toBeNull()
        if (scenario === 'path-selected')
          expect(
            await returned.evaluate(() =>
              localStorage.getItem('ounlog-recovery:other-task'),
            ),
          ).not.toBeNull()
      }
    }
    expect(
      (await (await request.get('/__test/stats')).json()).analysisAttempts,
    ).toBe(0)
  })
}
