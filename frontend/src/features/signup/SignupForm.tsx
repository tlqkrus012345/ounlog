import { useState, type FormEvent } from 'react'
import type { FieldError } from '../../shared/api/errors'
import { signup, SignupApiError, SignupTimeoutError } from './api'
import type { SignupRequest } from './types'
import './SignupForm.css'

type SignupField = keyof SignupRequest

type SignupFieldErrors = Partial<Record<SignupField, string>>

function convertFieldErrors(errors: FieldError[]): SignupFieldErrors {
  const fieldErrors: SignupFieldErrors = {}

  for (const error of errors) {
    if (error.field === 'email' || error.field === 'password') {
      fieldErrors[error.field] = error.message
    }
  }

  return fieldErrors
}

export function SignupForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<SignupFieldErrors>({})
  const [formError, setFormError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (isSubmitting) {
      return
    }

    setIsSubmitting(true)
    setFieldErrors({})
    setFormError('')
    setSuccessMessage('')

    try {
      const response = await signup({
        email,
        password,
      })

      setSuccessMessage(`${response.email} 계정이 생성되었습니다.`)
      setEmail('')
      setPassword('')
    } catch (error) {
      if (error instanceof SignupTimeoutError) {
        setFormError('요청 시간이 초과되었습니다. 잠시 후 다시 시도해 주세요.')
      } else if (error instanceof SignupApiError) {
        const nextFieldErrors = convertFieldErrors(error.fieldErrors)

        setFieldErrors(nextFieldErrors)

        if (Object.keys(nextFieldErrors).length === 0) {
          setFormError(error.message)
        }
      } else {
        setFormError('서버에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요.')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  function handleEmailChange(value: string) {
    setEmail(value)
    setFieldErrors((current) => ({
      ...current,
      email: undefined,
    }))
  }

  function handlePasswordChange(value: string) {
    setPassword(value)
    setFieldErrors((current) => ({
      ...current,
      password: undefined,
    }))
  }

  return (
    <section className="signup">
      <div className="signup__header">
        <h1>회원가입</h1>
        <p>이메일과 비밀번호를 입력해 주세요.</p>
      </div>

      <form className="signup__form" onSubmit={handleSubmit}>
        <div className="signup__field">
          <label htmlFor="email">이메일</label>
          <input
            id="email"
            name="email"
            type="email"
            value={email}
            onChange={(event) => handleEmailChange(event.target.value)}
            autoComplete="email"
            placeholder="example@email.com"
            aria-invalid={fieldErrors.email !== undefined}
            aria-describedby={fieldErrors.email ? 'email-error' : undefined}
            required
          />

          {fieldErrors.email && (
            <p id="email-error" className="signup__field-error">
              {fieldErrors.email}
            </p>
          )}
        </div>

        <div className="signup__field">
          <label htmlFor="password">비밀번호</label>
          <input
            id="password"
            name="password"
            type="password"
            value={password}
            onChange={(event) => handlePasswordChange(event.target.value)}
            autoComplete="new-password"
            minLength={8}
            maxLength={16}
            aria-invalid={fieldErrors.password !== undefined}
            aria-describedby={
              fieldErrors.password ? 'password-error' : 'password-hint'
            }
            required
          />

          {fieldErrors.password ? (
            <p id="password-error" className="signup__field-error">
              {fieldErrors.password}
            </p>
          ) : (
            <p id="password-hint" className="signup__hint">
              8자 이상 16자 이하로 입력해 주세요.
            </p>
          )}
        </div>

        {formError && (
          <p className="signup__form-error" role="alert">
            {formError}
          </p>
        )}

        {successMessage && (
          <p className="signup__success" role="status">
            {successMessage}
          </p>
        )}

        <button type="submit" disabled={isSubmitting}>
          {isSubmitting ? '가입 중...' : '가입하기'}
        </button>
      </form>
    </section>
  )
}
