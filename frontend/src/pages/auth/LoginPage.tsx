import { useLocation, useNavigate } from 'react-router-dom'
import { AuthStatus } from '../../features/auth/AuthStatus'
import { LoginForm } from '../../features/auth/LoginForm'
import { useAuth } from '../../features/auth/useAuth'
import { authCopy } from '../../features/auth/copy'
import { consumeRecovery, findRecovery } from '../../features/saju/recovery'
import { useEffect, useState } from 'react'
import '../../features/auth/auth.css'

function LoginPage() {
  const auth = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [submitting, setSubmitting] = useState(false)
  const record = findRecovery()
  const manualSignIn =
    auth.signInRequired && location.state?.reason === 'refresh-uncertain'
  useEffect(() => {
    if (auth.status === 'authenticated' && !submitting)
      navigate('/entry', { replace: true })
  }, [auth.status, navigate, submitting])
  return (
    <main className="login-page">
      <section className="login-panel">
        <h1>로그인</h1>
        {(location.state?.reason === 'expired' || record) && (
          <p role="status">{authCopy.expired}</p>
        )}
        {location.state?.reason === 'signup-complete' && (
          <p role="status">{authCopy.signupComplete}</p>
        )}
        {auth.status === 'checking' ||
        (auth.status === 'checkError' && !manualSignIn) ||
        auth.logoutState !== 'idle' ? (
          <AuthStatus />
        ) : (
          (auth.status !== 'authenticated' || submitting) && (
            <LoginForm
              onStart={() => {
                setSubmitting(true)
              }}
              onSettled={() => {
                setSubmitting(false)
              }}
              onSuccess={(result) => {
                const recovery = consumeRecovery(result.session.memberId)
                navigate(recovery?.targetPath ?? '/entry', {
                  replace: true,
                  state: { resumed: !!recovery, focusHeading: true },
                })
              }}
            />
          )
        )}
      </section>
    </main>
  )
}
export default LoginPage
