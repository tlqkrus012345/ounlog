import type { FieldError } from '../../shared/api/errors'
import { authCopy as copy } from './copy'
import type { LoginRequest } from './types'

export type LoginErrors = Partial<Record<keyof LoginRequest, string>>
export function validateLogin({ email, password }: LoginRequest): LoginErrors {
  const errors: LoginErrors = {}
  const normalized = email.trim()
  if (!normalized) errors.email = copy.emailRequired
  else if ([...normalized].length > 255) errors.email = copy.emailLong
  else if (!/^[^\s@]+@[^\s@]+$/u.test(normalized))
    errors.email = copy.emailInvalid
  if (!/\S/u.test(password)) errors.password = copy.passwordRequired
  else if (
    [...password].length > 64 ||
    new TextEncoder().encode(password).length > 72
  )
    errors.password = copy.passwordLong
  return errors
}
export function loginFieldErrors(errors: FieldError[]): LoginErrors {
  const result: LoginErrors = {}
  for (const field of ['email', 'password'] as const) {
    const codes = errors.filter((e) => e.field === field).map((e) => e.code)
    if (codes.includes('REQUIRED'))
      result[field] =
        field === 'email' ? copy.emailRequired : copy.passwordRequired
    else if (codes.includes('TOO_LONG'))
      result[field] = field === 'email' ? copy.emailLong : copy.passwordLong
    else if (field === 'email' && codes.includes('INVALID_FORMAT'))
      result.email = copy.emailInvalid
  }
  return result
}
