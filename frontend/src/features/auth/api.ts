import { request } from '../../shared/api/client'
import { ApiError, InvalidApiResponseError } from '../../shared/api/errors'
import type { LoginRequest, LoginResponse, SessionResponse } from './types'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}
function isUtc(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    /^\d{4}-\d{2}-\d{2}T.*Z$/.test(value) &&
    Number.isFinite(Date.parse(value))
  )
}
export function isSession(value: unknown): value is SessionResponse {
  return (
    isRecord(value) &&
    typeof value.memberId === 'string' &&
    /^[1-9][0-9]*$/.test(value.memberId) &&
    isUtc(value.sessionExpiresAt) &&
    isUtc(value.absoluteExpiresAt)
  )
}
function isToken(value: unknown): value is LoginResponse {
  return (
    isRecord(value) &&
    typeof value.accessToken === 'string' &&
    value.accessToken.length > 0 &&
    value.tokenType === 'Bearer' &&
    isUtc(value.accessTokenExpiresAt) &&
    isSession(value.session)
  )
}
const authCodes: Record<number, string[]> = {
  400: ['INVALID_REQUEST'],
  401: [
    'INVALID_CREDENTIALS',
    'AUTHENTICATION_REQUIRED',
    'ACCESS_TOKEN_EXPIRED',
    'SESSION_EXPIRED',
    'SESSION_INVALID',
  ],
  403: ['CSRF_INVALID'],
  500: ['INTERNAL_SERVER_ERROR'],
}
async function authRequest<T>(
  path: string,
  options: Parameters<typeof request<T>>[1],
): Promise<T> {
  try {
    return await request(path, {
      ...options,
      credentials: 'same-origin',
      cache: 'no-store',
    })
  } catch (error) {
    if (
      error instanceof ApiError &&
      (!isUtc(error.timestamp) ||
        !authCodes[error.status]?.includes(error.code))
    )
      throw new InvalidApiResponseError()
    throw error
  }
}
export const authApi = {
  csrf: () =>
    authRequest('/v1/auth/csrf', {
      validate: (v): v is { csrfToken: string } =>
        isRecord(v) &&
        typeof v.csrfToken === 'string' &&
        v.csrfToken.length > 0,
    }),
  login: (command: LoginRequest, csrf: string) =>
    authRequest('/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': csrf },
      body: JSON.stringify(command),
      validate: isToken,
    }),
  refresh: (csrf: string) =>
    authRequest('/v1/auth/refresh', {
      method: 'POST',
      headers: { 'X-CSRF-TOKEN': csrf },
      validate: isToken,
    }),
  session: (token: string, activity = false) =>
    authRequest('/v1/auth/session', {
      headers: {
        Authorization: `Bearer ${token}`,
        ...(activity ? { 'X-User-Activity': 'true' } : {}),
      },
      validate: isSession,
    }),
  logout: (csrf: string) =>
    authRequest('/v1/auth/logout', {
      method: 'POST',
      headers: { 'X-CSRF-TOKEN': csrf },
      validate: (v): v is undefined => v === undefined,
    }),
}
