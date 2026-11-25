import { test, expect, type Page } from '@playwright/test'

function deferred() {
  let resolve!: () => void
  const promise = new Promise<void>((done) => {
    resolve = done
  })
  return { promise, resolve }
}
async function submitLogin(page: Page, email = 'member@example.com') {
  await page.getByLabel('이메일', { exact: true }).fill(email)
  await page.getByLabel('비밀번호', { exact: true }).fill('password123')
  await page.getByRole('button', { name: '로그인', exact: true }).click()
  await expect(
    page.getByRole('button', { name: '로그아웃', exact: true }),
  ).toBeVisible()
}
async function preview(page: Page) {
  await page.goto('/login')
  await submitLogin(page)
  await page.getByRole('button', { name: /^사주/ }).click()
  await page.getByLabel('생년월일').fill('1995-03-21')
  await page.getByRole('button', { name: '남성', exact: true }).click()
  await page.getByRole('button', { name: '다음', exact: true }).click()
  await page.getByLabel('출생시간').fill('14:30')
  await page.getByRole('button', { name: '다음', exact: true }).click()
  await page.getByRole('button', { name: '분석 시작하기' }).click()
  await expect(
    page.getByRole('heading', { name: '전환', exact: true }),
  ).toBeVisible()
}
test.beforeEach(async ({ request }) => {
  await request.post('/__test/reset')
})

test('미리보기 만료 후 같은 회원이 재로그인하면 결과 부재 시 선택 화면으로 복귀하고 분석을 실행하지 않는다', async ({
  page,
  context,
  request,
}) => {
  let previewPosts = 0
  page.on('request', (r) => {
    if (r.method() === 'POST' && r.url().endsWith('/v1/saju/previews'))
      previewPosts++
  })
  await preview(page)
  await context.request.post('/__test/expire-session')
  await page.reload()
  await expect(page).toHaveURL('/login')
  await submitLogin(page)
  await expect(page).toHaveURL('/entry')
  const stats = await (await request.get('/__test/stats')).json()
  expect(stats.analysisAttempts).toBe(0)
  expect(stats.analyses).toBe(0)
  expect(previewPosts).toBe(1)
})

for (const destination of ['confirm', 'birth-time', 'preview'] as const) {
  for (const outcome of ['success', 'failure'] as const) {
    test(`분석 중 이탈 후 ${outcome} 응답은 ${destination} 화면을 변경하지 않는다`, async ({
      page,
      request,
    }) => {
      await preview(page)
      const started = deferred()
      const release = deferred()
      const delivered = deferred()
      await page.route('**/v1/saju/analysis', async (route) => {
        if (route.request().method() !== 'POST') return route.continue()
        const response = await route.fetch()
        started.resolve()
        await release.promise
        try {
          if (outcome === 'success') await route.fulfill({ response })
          else
            await route.fulfill({
              status: 500,
              json: {
                status: 500,
                code: 'INTERNAL_SERVER_ERROR',
                message: 'delayed failure',
                path: '/v1/saju/analysis',
                timestamp: new Date().toISOString(),
              },
            })
        } finally {
          delivered.resolve()
        }
      })
      try {
        await page.getByRole('button', { name: '전체 사주 분석 보기' }).click()
        await started.promise
        await page.goBack()
        await expect(page).toHaveURL('/saju/confirm')
        if (destination === 'birth-time') await page.goBack()
        if (destination === 'preview') {
          await page.getByRole('button', { name: '분석 시작하기' }).click()
          await expect(
            page.getByRole('heading', { name: '전환', exact: true }),
          ).toBeVisible()
        }
        const response = page.waitForResponse(
          (r) =>
            r.url().endsWith('/v1/saju/analysis') &&
            r.request().method() === 'POST',
        )
        release.resolve()
        await (await response).finished()
        await delivered.promise
        // Observe after the browser has consumed the body and React has painted.
        await page.evaluate(
          () =>
            new Promise<void>((done) =>
              requestAnimationFrame(() => requestAnimationFrame(() => done())),
            ),
        )
        await expect(page).toHaveURL(`/saju/${destination}`)
        await expect(page.getByRole('alert')).toHaveCount(0)
        const stats = await (await request.get('/__test/stats')).json()
        expect(stats.analysisAttempts).toBe(1)
        expect(stats.analyses).toBe(1) // Ignoring the UI response does not cancel completed server work.
      } finally {
        release.resolve()
      }
    })
  }
}

for (const email of ['member@example.com', 'other@example.com']) {
  test(`Refresh 응답 유실 후 다른 탭의 ${email} 로그인으로 자동 복원하며 과거 Cookie를 재사용하지 않는다`, async ({
    page,
    context,
    request,
  }) => {
    await page.goto('/login')
    await submitLogin(page)
    const initialStats = await (await request.get('/__test/stats')).json()
    const original = (await context.cookies()).find(
      (c) => c.name === 'ounlog_refresh',
    )!
    let dropNext = true
    await page.route('**/v1/auth/refresh', async (route) => {
      if (!dropNext) return route.continue()
      dropNext = false
      const rotated = await route.fetch()
      expect(rotated.status()).toBe(200) // The server rotates successfully, but the browser loses the response.
      // route.fetch shares the test context's cookie jar; restore the undelivered cookie explicitly.
      await context.addCookies([original])
      await route.abort('failed')
    })
    await page.reload()
    await expect(
      page.getByText('로그인 상태를 확인하지 못했습니다. 다시 시도해 주세요.'),
    ).toBeVisible()
    await page.getByRole('button', { name: '다시 시도', exact: true }).click()
    await expect(
      page.getByRole('link', { name: '로그인', exact: true }),
    ).toBeVisible()
    const failedStats = await (await request.get('/__test/stats')).json()
    expect(failedStats.refreshes).toBe(initialStats.refreshes + 1)
    const failedSessionIds = failedStats.refreshSessionIds.slice(
      initialStats.refreshSessionIds.length,
    )
    expect(failedSessionIds).toHaveLength(1)
    expect(failedSessionIds[0]).not.toBeNull()
    expect(
      (await context.cookies()).find((c) => c.name === 'ounlog_refresh')?.value,
    ).toBe(original.value)
    const other = await context.newPage()
    await other.goto('/login')
    await other.getByRole('link', { name: '로그인', exact: true }).click()
    await submitLogin(other, email)
    await expect(
      page.getByRole('button', { name: '로그아웃', exact: true }),
    ).toBeVisible()
    const stats = await (await request.get('/__test/stats')).json()
    expect(stats.refreshes).toBe(initialStats.refreshes + 2)
    const sessionIds = stats.refreshSessionIds.slice(
      initialStats.refreshSessionIds.length,
    )
    expect(sessionIds).toHaveLength(2)
    expect(sessionIds[1]).not.toBeNull()
    expect(sessionIds[1]).not.toBe(sessionIds[0])
    expect(stats.reuse).toBe(0)
  })
}
