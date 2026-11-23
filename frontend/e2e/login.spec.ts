import {
  test,
  expect,
  chromium,
  firefox,
  webkit,
  type Page,
} from '@playwright/test'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

async function login(page: Page, email = 'member@example.com') {
  await page.goto('/login')
  await page.getByLabel('이메일', { exact: true }).fill(email)
  await page.getByLabel('비밀번호', { exact: true }).fill('password123')
  await page.getByRole('button', { name: '로그인', exact: true }).click()
  await expect(
    page.getByRole('button', { name: '로그아웃', exact: true }),
  ).toBeVisible()
}
test.beforeEach(async ({ request }) => {
  await request.post('/__test/reset')
})
test('HTTPS 로그인·새로고침·HttpOnly 영속 쿠키', async ({
  page,
  context,
  request,
}) => {
  await login(page)
  await expect(page).toHaveURL('/entry')
  const refresh = (await context.cookies()).find(
    (c) => c.name === 'ounlog_refresh',
  )!
  expect(refresh).toMatchObject({
    httpOnly: true,
    secure: true,
    sameSite: 'Lax',
    path: '/v1/auth',
  })
  expect(refresh.expires).toBeGreaterThan(Date.now() / 1000)
  expect(await page.evaluate(() => document.cookie)).not.toContain(
    'ounlog_refresh',
  )
  expect(await page.evaluate(() => JSON.stringify(localStorage))).not.toContain(
    refresh.value,
  )
  await page.reload()
  await expect(
    page.getByRole('button', { name: '로그아웃', exact: true }),
  ).toBeVisible()
  expect((await (await request.get('/__test/stats')).json()).activities).toBe(0)
})
test('여러 탭의 재발급 직렬화·로그아웃 전파·다른 기기 독립', async ({
  page,
  context,
  browser,
  request,
}) => {
  await login(page)
  const second = await context.newPage()
  const third = await context.newPage()
  await Promise.all([second.goto('/entry'), third.goto('/entry')])
  await expect(
    second.getByRole('button', { name: '로그아웃', exact: true }),
  ).toBeVisible()
  await expect(
    third.getByRole('button', { name: '로그아웃', exact: true }),
  ).toBeVisible()
  const otherContext = await browser.newContext({
    baseURL: 'https://localhost:4173',
    ignoreHTTPSErrors: true,
  })
  const other = await otherContext.newPage()
  await login(other)
  const stats = await (await request.get('/__test/stats')).json()
  expect(stats.maxRefreshes).toBe(1)
  expect(stats.reuse).toBe(0)
  await page.getByRole('button', { name: '로그아웃', exact: true }).click()
  await expect(
    second.getByRole('button', { name: '로그인하기', exact: true }),
  ).toBeVisible()
  await expect(
    third.getByRole('button', { name: '로그인하기', exact: true }),
  ).toBeVisible()
  await expect(
    other.getByRole('button', { name: '로그아웃', exact: true }),
  ).toBeVisible()
  await otherContext.close()
})
test('로그인 검증·오류·320px·200% 텍스트 확대', async ({ page }, info) => {
  await page.setViewportSize({ width: 320, height: 700 })
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/login')
  await page.getByRole('button', { name: '로그인', exact: true }).click()
  await expect(page.getByLabel('이메일', { exact: true })).toBeFocused()
  await page.getByLabel('이메일', { exact: true }).fill('member@example.com')
  await page.getByLabel('비밀번호', { exact: true }).fill('wrong')
  await page.getByRole('button', { name: '로그인', exact: true }).click()
  await expect(page.getByRole('alert')).toHaveText(
    '이메일 또는 비밀번호가 올바르지 않거나 로그인이 일시적으로 제한되었습니다.',
  )
  await page.screenshot({
    path: info.outputPath('login-mobile-default.png'),
    fullPage: true,
  })
  await page.evaluate(() => {
    document.documentElement.style.fontSize = '200%'
  })
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true)
  await page.screenshot({
    path: info.outputPath('login-mobile.png'),
    fullPage: true,
  })
})
test('토큰 만료 시 요청 1회 재시도, 세션 만료 후에는 조회만 복구', async ({
  page,
  context,
  request,
}) => {
  await login(page)
  await page.getByRole('button', { name: /^사주/ }).click()
  await page.getByLabel('생년월일').fill('1995-03-21')
  await page.getByRole('button', { name: '남성', exact: true }).click()
  await page.getByRole('button', { name: '다음', exact: true }).click()
  await page.getByLabel('출생시간').fill('14:30')
  await page.getByRole('button', { name: '다음', exact: true }).click()
  await page.getByRole('button', { name: '분석 시작하기' }).click()
  await context.request.post('/__test/expire-access')
  await page.getByRole('button', { name: '전체 사주 분석 보기' }).click()
  await expect(
    page.getByRole('heading', { name: '전체 사주 분석', exact: true }),
  ).toBeVisible()
  let stats = await (await request.get('/__test/stats')).json()
  expect(stats.analyses).toBe(1)
  expect(stats.analysisAttempts).toBe(2)
  await page.reload()
  await expect(
    page.getByRole('heading', { name: '전체 사주 분석', exact: true }),
  ).toBeVisible()
  await context.request.post('/__test/expire-session')
  await page.reload()
  await expect(page).toHaveURL('/login')
  await expect(
    page.getByText('로그인이 만료되었습니다. 다시 로그인해 주세요.'),
  ).toBeVisible()
  await page.getByLabel('이메일', { exact: true }).fill('member@example.com')
  await page.getByLabel('비밀번호', { exact: true }).fill('password123')
  await page.getByRole('button', { name: '로그인', exact: true }).click()
  await expect(
    page.getByRole('heading', { name: '전체 사주 분석', exact: true }),
  ).toBeVisible()
  stats = await (await request.get('/__test/stats')).json()
  expect(stats.analyses).toBe(1)
})
test('실제 브라우저 종료 후 영속 프로필의 쿠키로 로그인 복원', async ({
  browserName,
}) => {
  const browserType = { chromium, firefox, webkit }[browserName]
  const directory = await mkdtemp(join(tmpdir(), 'ounlog-profile-'))
  const options = {
    baseURL: 'https://localhost:4173',
    ignoreHTTPSErrors: true,
    headless: true,
  }
  let context = await browserType.launchPersistentContext(directory, options)
  try {
    await login(await context.newPage())
    await context.close()
    context = await browserType.launchPersistentContext(directory, options)
    const page = await context.newPage()
    await page.goto('/entry')
    await expect(
      page.getByRole('button', { name: '로그아웃', exact: true }),
    ).toBeVisible()
  } finally {
    await context.close()
    await rm(directory, { recursive: true, force: true })
  }
})

test('로그아웃 실패 시 임시 입력은 제거하고 종료 완료를 가장하지 않는다', async ({
  page,
  request,
}) => {
  await login(page)
  await page.getByRole('button', { name: /^사주/ }).click()
  await page.getByLabel('생년월일').fill('1995-03-21')
  await request.post('/__test/fail-logout')
  await page.getByRole('button', { name: '로그아웃', exact: true }).click()
  await expect(page.getByRole('alert')).toHaveText(
    '로그아웃을 완료하지 못했습니다. 연결 상태를 확인하고 다시 시도해 주세요.',
  )
  expect(
    await page.evaluate(() => sessionStorage.getItem('saju-form')),
  ).toBeNull()
  await expect(
    page.getByRole('button', { name: '로그인하기', exact: true }),
  ).toHaveCount(0)
  await request.post('/__test/fail-logout')
  await page.getByRole('button', { name: '로그아웃', exact: true }).click()
  await expect(
    page.getByRole('button', { name: '로그인하기', exact: true }),
  ).toBeVisible()
})

test('다른 계정으로 재로그인하면 이전 입력·복구 기록을 제거한다', async ({
  page,
  context,
  request,
}) => {
  await login(page)
  await page.getByRole('button', { name: /^사주/ }).click()
  await page.getByLabel('생년월일').fill('1995-03-21')
  await context.request.post('/__test/expire-session')
  await page.goto('/saju/analysis')
  await expect(page).toHaveURL('/login')
  await page.getByLabel('이메일', { exact: true }).fill('other@example.com')
  await page.getByLabel('비밀번호', { exact: true }).fill('password123')
  await page.getByRole('button', { name: '로그인', exact: true }).click()
  await expect(page).toHaveURL('/entry')
  expect(
    await page.evaluate(() => sessionStorage.getItem('saju-form')),
  ).toBeNull()
  expect(
    await page.evaluate(() =>
      Object.keys(localStorage).filter((key) =>
        key.startsWith('ounlog-recovery:'),
      ),
    ),
  ).toEqual([])
  expect((await (await request.get('/__test/stats')).json()).analyses).toBe(0)
})
