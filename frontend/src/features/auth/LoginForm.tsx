import { useEffect, useRef, useState, type FormEvent } from 'react'
import { ApiError } from '../../shared/api/errors'
import { authCopy } from './copy'
import { useAuth } from './useAuth'
import { loginFieldErrors, validateLogin, type LoginErrors } from './validation'
import type { LoginResponse } from './types'

export function LoginForm({
  onSuccess,
  onStart,
  onSettled,
}: {
  onSuccess: (result: LoginResponse) => void
  onStart?: () => void
  onSettled?: () => void
}) {
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState<LoginErrors>({})
  const [message, setMessage] = useState('')
  const [pending, setPending] = useState(false)
  const busy = useRef(false)
  const mounted = useRef(true)
  const emailRef = useRef<HTMLInputElement>(null)
  const passwordRef = useRef<HTMLInputElement>(null)
  const errorRef = useRef<HTMLParagraphElement>(null)
  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])
  useEffect(() => {
    if (errors.email) emailRef.current?.focus()
    else if (errors.password) passwordRef.current?.focus()
    else if (message) errorRef.current?.focus()
  }, [errors, message])
  async function submit(event: FormEvent) {
    event.preventDefault()
    if (busy.current) return
    const command = { email: email.trim(), password }
    setEmail(command.email)
    const next = validateLogin(command)
    setErrors(next)
    setMessage('')
    if (Object.keys(next).length) return
    busy.current = true
    setPending(true)
    onStart?.()
    try {
      const result = await login(command)
      if (mounted.current) onSuccess(result)
    } catch (error) {
      if (!mounted.current) return
      const fields =
        error instanceof ApiError && error.code === 'INVALID_REQUEST'
          ? loginFieldErrors(error.fieldErrors)
          : {}
      onSettled?.()
      setErrors(fields)
      if (!Object.keys(fields).length)
        setMessage(
          error instanceof ApiError && error.code === 'INVALID_CREDENTIALS'
            ? authCopy.rejected
            : authCopy.loginError,
        )
    } finally {
      busy.current = false
      if (mounted.current) {
        setPending(false)
      }
    }
  }
  function edit(field: 'email' | 'password', value: string) {
    if (field === 'email') setEmail(value)
    else setPassword(value)
    setErrors((old) => ({ ...old, [field]: undefined }))
    setMessage('')
  }
  return (
    <form
      className="login-form"
      onSubmit={submit}
      noValidate
      aria-busy={pending}
    >
      <div className="login-field">
        <label htmlFor="login-email">이메일</label>
        <input
          ref={emailRef}
          id="login-email"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          value={email}
          readOnly={pending}
          onChange={(e) => edit('email', e.target.value)}
          aria-invalid={!!errors.email}
          aria-describedby={errors.email ? 'login-email-error' : undefined}
        />
        {errors.email && (
          <p className="auth-error" id="login-email-error">
            {errors.email}
          </p>
        )}
      </div>
      <div className="login-field">
        <label htmlFor="login-password">비밀번호</label>
        <input
          ref={passwordRef}
          id="login-password"
          name="password"
          type="password"
          autoComplete="current-password"
          value={password}
          readOnly={pending}
          onChange={(e) => edit('password', e.target.value)}
          aria-invalid={!!errors.password}
          aria-describedby={
            errors.password ? 'login-password-error' : undefined
          }
        />
        {errors.password && (
          <p className="auth-error" id="login-password-error">
            {errors.password}
          </p>
        )}
      </div>
      {message && (
        <p className="auth-error" role="alert" ref={errorRef} tabIndex={-1}>
          {message}
        </p>
      )}
      <button className="auth-primary" type="submit" disabled={pending}>
        {pending ? '로그인 중...' : '로그인'}
      </button>
    </form>
  )
}
