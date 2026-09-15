import { request } from '../../shared/api/client'
import type { LoginRequest, LoginResponse } from './types'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isLoginResponse(value: unknown): value is LoginResponse {
  return (
    isRecord(value) &&
    typeof value.accessToken === 'string' &&
    value.tokenType === 'Bearer'
  )
}

export function login(loginRequest: LoginRequest): Promise<LoginResponse> {
  return request('/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(loginRequest),
    validate: isLoginResponse,
  })
}
