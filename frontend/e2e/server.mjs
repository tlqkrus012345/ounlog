// Test-only authentication contract fixture. This is not a replacement for the Spring backend.
import { createServer } from 'vite'
import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const directory = mkdtempSync(join(tmpdir(), 'ounlog-e2e-tls-'))
execFileSync(
  'openssl',
  [
    'req',
    '-x509',
    '-newkey',
    'rsa:2048',
    '-nodes',
    '-keyout',
    join(directory, 'key.pem'),
    '-out',
    join(directory, 'cert.pem'),
    '-days',
    '1',
    '-subj',
    '/CN=localhost',
  ],
  { stdio: 'ignore' },
)
const https = {
  key: readFileSync(join(directory, 'key.pem')),
  cert: readFileSync(join(directory, 'cert.pem')),
}
rmSync(directory, { recursive: true })
const sessions = new Map()
const tokens = new Map()
const refreshTokens = new Map()
const results = new Map()
let sequence = 0
let stats
let activeRefreshes = 0
let failLogout = false
function reset() {
  sessions.clear()
  tokens.clear()
  refreshTokens.clear()
  results.clear()
  activeRefreshes = 0
  failLogout = false
  stats = {
    refreshes: 0,
    refreshSessionIds: [],
    maxRefreshes: 0,
    reuse: 0,
    analyses: 0,
    analysisAttempts: 0,
    activities: 0,
  }
}
reset()
const cookie = (value, age = 86400) =>
  `ounlog_refresh=${value}; Path=/v1/auth; Max-Age=${age}; HttpOnly; Secure; SameSite=Lax`
const sessionView = (s) => ({
  memberId: s.memberId,
  sessionExpiresAt: new Date(
    Math.min(s.activeAt + 28800000, s.createdAt + 86400000),
  ).toISOString(),
  absoluteExpiresAt: new Date(s.createdAt + 86400000).toISOString(),
})
function issue(s) {
  const accessToken = `test-access-${++sequence}`
  const refresh = `test-refresh-${++sequence}`
  tokens.set(accessToken, { session: s, expired: false })
  refreshTokens.set(refresh, s)
  s.refresh = refresh
  return {
    body: {
      accessToken,
      tokenType: 'Bearer',
      accessTokenExpiresAt: new Date(Date.now() + 900000).toISOString(),
      session: sessionView(s),
    },
    cookie: cookie(
      refresh,
      Math.max(0, Math.floor((s.createdAt + 86400000 - Date.now()) / 1000)),
    ),
  }
}
function fullResult() {
  const paragraph = { content: '테스트 회원의 분석 결과입니다.', evidence: [] }
  return {
    result: {
      schemaVersion: '2',
      ...Object.fromEntries(
        [
          'fiveElements',
          'annualOverview',
          'personality',
          'career',
          'wealth',
          'relationship',
          'currentLuck',
        ].map((key) => [key, paragraph]),
      ),
    },
    legacyResult: null,
    asOfDate: '2026-11-23',
  }
}
const fixture = {
  name: 'ounlog-test-api',
  configureServer(vite) {
    vite.middlewares.use(async (req, res, next) => {
      const path = req.url?.split('?')[0]
      if (!path.startsWith('/v1/') && !path.startsWith('/__test/'))
        return next()
      const send = (status, body, cookies) => {
        res.statusCode = status
        res.setHeader('Cache-Control', 'no-store')
        if (cookies) res.setHeader('Set-Cookie', cookies)
        if (body !== undefined) {
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify(body))
        } else res.end()
      }
      const error = (code, status = 401) =>
        send(status, {
          status,
          code,
          message: '서버 내부 문구',
          path,
          timestamp: new Date().toISOString(),
        })
      const refresh = /(?:^|;\s*)ounlog_refresh=([^;]*)/.exec(
        req.headers.cookie ?? '',
      )?.[1]
      if (path === '/__test/reset') {
        reset()
        return send(200, {})
      }
      if (path === '/__test/stats') return send(200, stats)
      if (path === '/__test/fail-logout') {
        failLogout = !failLogout
        return send(200, {})
      }
      if (path === '/__test/expire-access') {
        tokens.forEach((v) => {
          v.expired = true
        })
        return send(200, {})
      }
      if (path === '/__test/expire-session') {
        sessions.forEach((session) => {
          session.expired = true
        })
        return send(200, {})
      }
      if (path === '/v1/auth/csrf')
        return send(200, { csrfToken: 'test-csrf' }, [
          'csrf_context=test-csrf; Path=/; HttpOnly; Secure; SameSite=Lax',
        ])
      if (
        ['/v1/auth/login', '/v1/auth/refresh', '/v1/auth/logout'].includes(
          path,
        ) &&
        req.headers['x-csrf-token'] !== 'test-csrf'
      )
        return error('CSRF_INVALID', 403)
      if (path === '/v1/auth/login') {
        const chunks = []
        for await (const chunk of req) chunks.push(chunk)
        const command = JSON.parse(Buffer.concat(chunks).toString())
        if (command.password !== 'password123')
          return error('INVALID_CREDENTIALS')
        const memberId = command.email === 'other@example.com' ? '2' : '1'
        const s = {
          id: String(++sequence),
          memberId,
          createdAt: Date.now(),
          activeAt: Date.now(),
          revoked: false,
        }
        sessions.set(s.id, s)
        const issued = issue(s)
        return send(200, issued.body, [issued.cookie])
      }
      if (path === '/v1/auth/logout') {
        if (failLogout) return error('INTERNAL_SERVER_ERROR', 500)
        const s = refreshTokens.get(refresh)
        if (s) s.revoked = true
        return send(204, undefined, [cookie('', 0)])
      }
      if (path === '/v1/auth/refresh') {
        stats.refreshes++
        const s = refreshTokens.get(refresh)
        stats.refreshSessionIds.push(s?.id ?? null)
        if (!refresh) return error('AUTHENTICATION_REQUIRED')
        if (!s || s.revoked) return error('SESSION_INVALID')
        if (s.expired) return error('SESSION_EXPIRED')
        activeRefreshes++
        stats.maxRefreshes = Math.max(stats.maxRefreshes, activeRefreshes)
        await new Promise((resolve) => setTimeout(resolve, 80))
        activeRefreshes--
        if (s.refresh !== refresh) {
          stats.reuse++
          s.revoked = true
          return error('SESSION_INVALID')
        }
        const issued = issue(s)
        return send(200, issued.body, [issued.cookie])
      }
      if (path === '/v1/saju/previews')
        return send(200, {
          year: 2026,
          keyword: '전환',
          summary: '미리보기 결과입니다.',
        })
      if (path === '/v1/saju/analysis' && req.method === 'POST')
        stats.analysisAttempts++
      const token = tokens.get(
        req.headers.authorization?.replace('Bearer ', ''),
      )
      if (!token) return error('AUTHENTICATION_REQUIRED')
      if (token.expired) return error('ACCESS_TOKEN_EXPIRED')
      const s = token.session
      if (s.revoked) return error('SESSION_INVALID')
      if (s.expired) return error('SESSION_EXPIRED')
      if (req.headers['x-user-activity'] === 'true') {
        s.activeAt = Date.now()
        stats.activities++
      }
      if (path === '/v1/auth/session') return send(200, sessionView(s))
      if (path === '/v1/saju/analysis') {
        if (req.method === 'POST') {
          stats.analyses++
          results.set(s.memberId, fullResult())
          return send(201, results.get(s.memberId))
        }
        return results.has(s.memberId)
          ? send(200, results.get(s.memberId))
          : error('SAJU_ANALYSIS_NOT_FOUND', 404)
      }
      error('INTERNAL_SERVER_ERROR', 500)
    })
  },
}
const vite = await createServer({
  plugins: [fixture],
  server: { host: 'localhost', port: 4173, strictPort: true, https },
})
await vite.listen()
