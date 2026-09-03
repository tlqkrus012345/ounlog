import type {
  ApiErrorResponse,
  FieldError,
  SignupRequest,
  SignupResponse,
} from './types'

const REQUEST_TIMEOUT_MS = 10_000

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

export class SignupTimeoutError extends Error {
  constructor() {
    super('회원가입 요청 시간이 초과되었습니다.')
    this.name = 'SignupTimeoutError'
  }
}

export class InvalidApiResponseError extends Error {
  constructor() {
    super('서버 응답 형식이 올바르지 않습니다.')
    this.name = 'InvalidApiResponseError'
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isFieldError(value: unknown): value is FieldError {
  return (
    isRecord(value) &&
    typeof value.field === 'string' &&
    typeof value.code === 'string' &&
    typeof value.message === 'string'
  )
}

function isApiErrorResponse(value: unknown): value is ApiErrorResponse {
  if (!isRecord(value)) {
    return false
  }

  const hasRequiredFields =
    typeof value.status === 'number' &&
    typeof value.code === 'string' &&
    typeof value.message === 'string' &&
    typeof value.path === 'string'

  if (!hasRequiredFields) {
    return false
  }

  return (
    value.errors === undefined ||
    (Array.isArray(value.errors) && value.errors.every(isFieldError))
  )
}

function isSignupResponse(value: unknown): value is SignupResponse {
  return isRecord(value) && typeof value.email === 'string'
}

async function parseJson(response: Response): Promise<unknown> {
  try {
    return await response.json()
  } catch {
    throw new InvalidApiResponseError()
  }
}

export async function signup(request: SignupRequest): Promise<SignupResponse> {
  const controller = new AbortController()

  const timeoutId = window.setTimeout(() => {
    controller.abort()
  }, REQUEST_TIMEOUT_MS)

  let response: Response

  try {
    response = await fetch('/v1/members/signup', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
      signal: controller.signal,
    })
  } catch (error) {
    if (controller.signal.aborted) {
      throw new SignupTimeoutError()
    }

    throw error
  } finally {
    window.clearTimeout(timeoutId)
  }

  const responseBody = await parseJson(response)

  if (!response.ok) {
    if (!isApiErrorResponse(responseBody)) {
      throw new InvalidApiResponseError()
    }

    throw new SignupApiError(responseBody)
  }

  if (!isSignupResponse(responseBody)) {
    throw new InvalidApiResponseError()
  }

  return responseBody
}
