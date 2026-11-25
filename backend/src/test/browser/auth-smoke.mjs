// Real Spring/MySQL authentication, served through a test-only same-origin HTTPS proxy.
import { createRequire } from 'node:module'
import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const require = createRequire(new URL('../../../../frontend/package.json', import.meta.url))
const { chromium, firefox, webkit, expect } = require('@playwright/test')
const { createServer } = await import(require.resolve('vite'))
const frontend = fileURLToPath(new URL('../../../../frontend', import.meta.url))
const directory = mkdtempSync(join(tmpdir(), 'ounlog-real-auth-'))
execFileSync('openssl', ['req', '-x509', '-newkey', 'rsa:2048', '-nodes',
  '-keyout', join(directory, 'key.pem'), '-out', join(directory, 'cert.pem'),
  '-days', '1', '-subj', '/CN=localhost', '-addext', 'subjectAltName=DNS:localhost'], { stdio: 'ignore' })
const server = await createServer({
  root: frontend,
  configFile: join(frontend, 'vite.config.ts'),
  server: {
    host: 'localhost', port: 0,
    https: { key: readFileSync(join(directory, 'key.pem')), cert: readFileSync(join(directory, 'cert.pem')) },
    proxy: { '/v1': { target: `http://127.0.0.1:${Number(process.argv[2])}`, changeOrigin: true } },
  },
})
const contexts = new Set()
try {
  await server.listen()
  const baseURL = `https://localhost:${server.httpServer.address().port}`
  for (const [name, engine] of Object.entries({ chromium, firefox, webkit })) {
    const options = { headless: true, baseURL, ignoreHTTPSErrors: true }
    const profile = join(directory, name)
    let context = await engine.launchPersistentContext(profile, options)
    contexts.add(context)
    let page = await context.newPage()
    let analyses = 0
    const watch = (p) => p.on('request', (request) => {
      if (request.url().includes('/v1/saju/analysis') && request.method() === 'POST') analyses++
    })
    watch(page)
    const login = async (p) => {
      await p.goto('/login')
      await p.getByLabel('이메일', { exact: true }).fill('browser@test.com')
      await p.getByLabel('비밀번호', { exact: true }).fill('password123!')
      await p.getByRole('button', { name: '로그인', exact: true }).click()
      await expect(p.getByRole('button', { name: '로그아웃', exact: true })).toBeVisible()
      await expect(p).toHaveURL(`${baseURL}/entry`)
    }
    await login(page)
    const refresh = (await context.cookies()).find((cookie) => cookie.name === 'ounlog_refresh')
    expect(refresh).toMatchObject({ httpOnly: true, secure: true, sameSite: 'Lax', path: '/v1/auth' })
    expect(refresh.expires).toBeGreaterThan(Date.now() / 1000)
    expect(await page.evaluate(() => document.cookie)).not.toContain('ounlog_refresh')
    expect(await page.evaluate(() => JSON.stringify(localStorage))).not.toContain(refresh.value)
    await page.reload()
    await expect(page.getByRole('button', { name: '로그아웃', exact: true })).toBeVisible()
    const second = await context.newPage()
    const third = await context.newPage()
    watch(second); watch(third)
    await Promise.all([second.goto('/entry'), third.goto('/entry'), page.reload()])
    for (const p of [page, second, third]) {
      await expect(p.getByRole('button', { name: '로그아웃', exact: true })).toBeVisible()
    }
    await context.close()
    contexts.delete(context)
    context = await engine.launchPersistentContext(profile, options)
    contexts.add(context)
    page = await context.newPage()
    watch(page)
    await page.goto('/entry')
    await expect(page.getByRole('button', { name: '로그아웃', exact: true })).toBeVisible()
    await page.goto('/login')
    await expect(page).toHaveURL(`${baseURL}/entry`)
    const otherContext = await engine.launchPersistentContext(join(directory, `${name}-other`), options)
    contexts.add(otherContext)
    const other = await otherContext.newPage()
    watch(other)
    await login(other)
    const sameBrowserTab = await context.newPage()
    watch(sameBrowserTab)
    await sameBrowserTab.goto('/entry')
    await expect(sameBrowserTab.getByRole('button', { name: '로그아웃', exact: true })).toBeVisible()
    await page.getByRole('button', { name: '로그아웃', exact: true }).click()
    await expect(page.getByRole('button', { name: '로그인하기', exact: true })).toBeVisible()
    await expect(sameBrowserTab.getByRole('button', { name: '로그인하기', exact: true })).toBeVisible()
    await other.reload()
    await expect(other.getByRole('button', { name: '로그아웃', exact: true })).toBeVisible()
    expect(analyses).toBe(0)
    expect((await context.cookies()).some((cookie) => cookie.name === 'ounlog_refresh')).toBe(false)
    await context.close(); contexts.delete(context)
    await otherContext.close(); contexts.delete(otherContext)
    console.log(`${name}: Spring login, rotation, reload, browser restart, tabs and isolated logout passed`)
  }
} finally {
  for (const context of contexts) await context.close()
  await server.close()
  rmSync(directory, { recursive: true, force: true })
}
