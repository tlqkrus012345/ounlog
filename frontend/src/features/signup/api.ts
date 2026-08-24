import type {
  ApiErrorResponse,
  FieldError,
  SignupRequest,
  SignupResponse,
} from './types'

export class SignupApiError extends Error {
  readonly status: number
  readonly code: string
  readonly fieldErrors: FieldError[]

  constructor(response: ApiErrorResponse) {
    super(response.message)

    this.name = 'SignupApiError'
    this.status = response.status
    this.code = response.code
    this.fieldErrors = response.errors ?? []
  }
}

export async function signup(
  request: SignupRequest,
): Promise<SignupResponse> {
  const response = await fetch('/v1/members/signup', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  })

  if (!response.ok) {
    const errorResponse: ApiErrorResponse = await response.json()
    throw new SignupApiError(errorResponse)
  }

  const signupResponse: SignupResponse = await response.json()
  return signupResponse
}