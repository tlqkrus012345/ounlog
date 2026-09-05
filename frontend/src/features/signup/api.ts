import { request } from '../../shared/api/client'
import type { SignupRequest, SignupResponse } from './types'

export {
  ApiError as SignupApiError,
  ApiTimeoutError as SignupTimeoutError,
  InvalidApiResponseError,
} from '../../shared/api/errors'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isSignupResponse(value: unknown): value is SignupResponse {
  return isRecord(value) && typeof value.email === 'string'
}

export function signup(signupRequest: SignupRequest): Promise<SignupResponse> {
  return request('/v1/members/signup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(signupRequest),
    validate: isSignupResponse,
  })
}
