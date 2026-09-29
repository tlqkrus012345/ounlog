import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { login } from '../auth/api'
import { useAuth } from '../auth/useAuth'
import { createSajuAnalysis } from '../saju/api'
import { toSajuAnalysisRequest } from '../saju/mapper'
import { getSajuForm } from '../saju/storage'
import type { FieldError } from '../../shared/api/errors'
import { signup, SignupApiError, SignupTimeoutError } from './api'
import type { SignupRequest } from './types'
import './SignupForm.css'

type SignupField = keyof SignupRequest

type SignupFieldErrors = Partial<Record<SignupField, string>>

type SubmissionStep = 'idle' | 'signup' | 'login' | 'analysis'

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
  const navigate = useNavigate()
  const { accessToken, setAccessToken } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const [submissionStep, setSubmissionStep] = useState<SubmissionStep>('idle')
  const [fieldErrors, setFieldErrors] = useState<SignupFieldErrors>({})
  const [formError, setFormError] = useState('')
  const [analysisFailed, setAnalysisFailed] = useState(false)

  const isSubmitting = submissionStep !== 'idle'

  async function runSajuAnalysis(token: string) {
    const sajuForm = getSajuForm()

    if (!sajuForm) {
      navigate('/saju', { replace: true })
      return
    }

    setSubmissionStep('analysis')

    try {
      const analysisRequest = toSajuAnalysisRequest(sajuForm)
      const analysisResult = await createSajuAnalysis(analysisRequest, token)

      navigate('/saju/analysis', {
        state: analysisResult,
      })
    } catch {
      setAnalysisFailed(true)
      setFormError('사주 분석을 생성하지 못했습니다. 다시 시도해주세요.')
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (isSubmitting) {
      return
    }

    setSubmissionStep('signup')
    setFieldErrors({})
    setFormError('')

    try {
      try {
        await signup({ email, password })
      } catch (error) {
        if (error instanceof SignupTimeoutError) {
          setFormError(
            '요청 시간이 초과되었습니다. 잠시 후 다시 시도해 주세요.',
          )
        } else if (error instanceof SignupApiError) {
          const nextFieldErrors = convertFieldErrors(error.fieldErrors)

          setFieldErrors(nextFieldErrors)

          if (Object.keys(nextFieldErrors).length === 0) {
            setFormError(error.message)
          }
        } else {
          setFormError('서버에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요.')
        }

        return
      }

      let loginAccessToken: string

      try {
        setSubmissionStep('login')
        const response = await login({ email, password })
        loginAccessToken = response.accessToken
        setAccessToken(loginAccessToken)
      } catch {
        navigate('/login', {
          state: {
            message: '회원가입은 완료되었습니다. 다시 로그인해주세요.',
          },
        })
        return
      }

      await runSajuAnalysis(loginAccessToken)
    } finally {
      setSubmissionStep('idle')
    }
  }

  async function handleAnalysisRetry() {
    if (isSubmitting || accessToken === null) {
      return
    }

    setFormError('')

    try {
      await runSajuAnalysis(accessToken)
    } finally {
      setSubmissionStep('idle')
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

  if (analysisFailed) {
    return (
      <section className="signup">
        <div className="signup__header">
          <h1>사주 분석</h1>
          <p>회원가입과 로그인은 완료되었습니다.</p>
        </div>

        <div className="signup__form">
          {formError && (
            <p className="signup__form-error" role="alert">
              {formError}
            </p>
          )}

          <button
            type="button"
            disabled={isSubmitting}
            onClick={handleAnalysisRetry}
          >
            {submissionStep === 'analysis'
              ? '사주 분석 생성 중...'
              : '다시 시도'}
          </button>
        </div>
      </section>
    )
  }

  const submitButtonLabel =
    submissionStep === 'signup'
      ? '가입 중...'
      : submissionStep === 'login'
        ? '로그인 중...'
        : submissionStep === 'analysis'
          ? '사주 분석 생성 중...'
          : '가입하기'

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

        <button type="submit" disabled={isSubmitting}>
          {submitButtonLabel}
        </button>
      </form>
    </section>
  )
}
