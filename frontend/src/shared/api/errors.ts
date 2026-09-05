export interface FieldError {
  field: string
  code: string
  message: string
}

export interface ApiErrorResponse {
  status: number
  code: string
  message: string
  path: string
  errors?: FieldError[]
}

export class ApiError extends Error {
  readonly status: number
  readonly code: string
  readonly fieldErrors: FieldError[]

  constructor(response: ApiErrorResponse) {
    super(response.message)
    this.name = 'ApiError'
    this.status = response.status
    this.code = response.code
    this.fieldErrors = response.errors ?? []
  }
}

export class ApiTimeoutError extends Error {
  constructor() {
    super('요청 시간이 초과되었습니다.')
    this.name = 'ApiTimeoutError'
  }
}

export class InvalidApiResponseError extends Error {
  constructor() {
    super('서버 응답 형식이 올바르지 않습니다.')
    this.name = 'InvalidApiResponseError'
  }
}
