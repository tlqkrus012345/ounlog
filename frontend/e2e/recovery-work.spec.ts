import { test, expect, type Page } from '@playwright/test'

async function submitLogin(page: Page) {
  await page.getByLabel('이메일', { exact: true }).fill('member@example.com')
  await page.getByLabel('비밀번호', { exact: true }).fill('password123')
  await page.getByRole('button', { name: '로그인', exact: true }).click()
}
async function enterWork(page: Page, birthDate: string) {
  await page.getByRole('button', { name: /^사주/ }).click()
  await page.getByLabel('생년월일').fill(birthDate)
  await page.getByRole('button', { name: '남성', exact: true }).click()
  await page.getByRole('button', { name: '다음', exact: true }).click()
  await page.getByLabel('출생시간').fill('14:30')
  await page.getByRole('button', { name: '다음', exact: true }).click()
  await expect(page).toHaveURL('/saju/confirm')
  await expect(page.getByText(birthDate, { exact: true })).toBeVisible()
  return page.evaluate(() => JSON.parse(sessionStorage.getItem('saju-form')!))
}
async function recoveryRecords(page: Page) {
  return page.evaluate(() =>
    Object.keys(localStorage)
      .filter((key) => key.startsWith('ounlog-recovery:'))
      .map((key) => JSON.parse(localStorage.getItem(key)!)),
  )
}
test.beforeEach(async ({ request }) => {
  await request.post('/__test/reset')
})

for (const order of ['A→B', 'B→A']) {
  test(`두 탭을 ${order} 순서로 만료해도 각자 작성한 입력으로 복귀한다`, async ({
    page,
    context,
    request,
  }) => {
    await page.goto('/login')
    await submitLogin(page)
    await expect(page).toHaveURL('/entry')
    const draftA = await enterWork(page, '1995-03-21')
    const second = await context.newPage()
    await second.goto('/entry')
    await expect(
      second.getByRole('button', { name: '로그아웃', exact: true }),
    ).toBeVisible()
    const draftB = await enterWork(second, '2000-01-01')
    expect(draftA.workId).not.toBe(draftB.workId)
    const tasks =
      order === 'A→B'
        ? [
            { page, draft: draftA },
            { page: second, draft: draftB },
          ]
        : [
            { page: second, draft: draftB },
            { page, draft: draftA },
          ]

    await request.post('/__test/expire-session')
    for (const task of tasks) {
      await task.page.reload()
      await expect(task.page).toHaveURL('/login')
      await expect(
        task.page.getByText('1995-03-21', { exact: true }),
      ).toHaveCount(0)
      await expect(
        task.page.getByText('2000-01-01', { exact: true }),
      ).toHaveCount(0)
    }
    const records = await recoveryRecords(page)
    expect(records).toHaveLength(2)
    for (const task of tasks) {
      expect(
        records.find((r) => r.workId === task.draft.workId)?.input,
      ).toEqual(task.draft.input)
    }
    await submitLogin(tasks[0].page)
    await expect(tasks[0].page).toHaveURL('/saju/confirm')
    await expect(
      tasks[0].page.getByText(tasks[0].draft.input.birthDate, { exact: true }),
    ).toBeVisible()

    // Another tab's login keeps the existing login-page redirect policy.
    // Reopening this task must still show its own draft and retain its unconsumed deadline.
    await expect(tasks[1].page).toHaveURL('/entry')
    await tasks[1].page.goto('/saju/confirm')
    await expect(
      tasks[1].page.getByText(tasks[1].draft.input.birthDate, { exact: true }),
    ).toBeVisible()
    const pending = records.find((r) => r.workId === tasks[1].draft.workId)!
    await request.post('/__test/expire-session')
    await tasks[1].page.reload()
    await expect(tasks[1].page).toHaveURL('/login')
    expect(
      (await recoveryRecords(page)).find((r) => r.id === pending.id)?.createdAt,
    ).toBe(pending.createdAt)
    await submitLogin(tasks[1].page)
    await expect(tasks[1].page).toHaveURL('/saju/confirm')
    for (const task of tasks) {
      await expect(
        task.page.getByText(task.draft.input.birthDate, { exact: true }),
      ).toBeVisible()
      expect(
        await task.page.evaluate(
          () => JSON.parse(sessionStorage.getItem('saju-form')!).workId,
        ),
      ).toBe(task.draft.workId)
    }
    expect(await recoveryRecords(page)).toEqual([])
    expect(
      (await (await request.get('/__test/stats')).json()).analysisAttempts,
    ).toBe(0)
  })
}

test('복구 기록 소비 시 QuotaExceededError는 원본을 보존하고 선택 화면으로 이동한다', async ({
  page,
  request,
}) => {
  await page.goto('/login')
  await submitLogin(page)
  await expect(page).toHaveURL('/entry')
  await enterWork(page, '1995-03-21')
  await request.post('/__test/expire-session')
  await page.reload()
  await expect(page).toHaveURL('/login')
  const [record] = await recoveryRecords(page)
  await page.evaluate(() => {
    sessionStorage.removeItem('saju-form')
    const setItem = Storage.prototype.setItem
    Storage.prototype.setItem = function (key, value) {
      if (this === sessionStorage && key === 'saju-form')
        throw new DOMException('full', 'QuotaExceededError')
      setItem.call(this, key, value)
    }
  })
  await submitLogin(page)
  await expect(page).toHaveURL('/entry')
  await expect(page.getByText('1995-03-21', { exact: true })).toHaveCount(0)
  await expect(
    page.getByText('입력한 내용을 확인한 뒤 분석을 다시 실행해 주세요.'),
  ).toHaveCount(0)
  expect(
    await page.evaluate(() => sessionStorage.getItem('saju-form')),
  ).toBeNull()
  expect(await recoveryRecords(page)).toEqual([record])
  expect(
    await page.evaluate(() =>
      sessionStorage.getItem('ounlog-recovery-current'),
    ),
  ).toBe(record.id)
  expect(
    (await (await request.get('/__test/stats')).json()).analysisAttempts,
  ).toBe(0)
})
