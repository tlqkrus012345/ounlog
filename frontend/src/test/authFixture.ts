import { http, HttpResponse } from 'msw'
import type { LoginResponse } from '../features/auth/types'

export function tokenResponse(
  memberId = '1',
  accessToken = 'access-token',
): LoginResponse {
  return {
    accessToken,
    tokenType: 'Bearer',
    accessTokenExpiresAt: '2099-01-01T00:15:00Z',
    session: {
      memberId,
      sessionExpiresAt: '2099-01-01T08:00:00Z',
      absoluteExpiresAt: '2099-01-02T00:00:00Z',
    },
  }
}
export function authError(code: string, status = 401) {
  return HttpResponse.json(
    {
      status,
      code,
      message: 'Untrusted message',
      path: '/v1/auth',
      timestamp: '2026-11-23T00:00:00Z',
    },
    { status },
  )
}
export const guestAuthHandlers = [
  http.get('/v1/auth/csrf', () =>
    HttpResponse.json({ csrfToken: 'csrf-token' }),
  ),
  http.post('/v1/auth/refresh', () => authError('AUTHENTICATION_REQUIRED')),
  http.get('/v1/auth/session', () =>
    HttpResponse.json(tokenResponse().session),
  ),
]
