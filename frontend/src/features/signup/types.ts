export interface SignupRequest {
  email: string
  password: string
}

export interface SignupResponse {
  email: string
}

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