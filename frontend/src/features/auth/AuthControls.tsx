import { useNavigate } from 'react-router-dom'
import { authCopy } from './copy'
import { useAuth } from './useAuth'
import { AuthStatus } from './AuthStatus'

export function AuthControls() {
  const auth = useAuth()
  const navigate = useNavigate()
  if (auth.logoutState !== 'idle')
    return (
      <div className="auth-controls">
        {auth.logoutState === 'error' && (
          <p className="auth-error" role="alert">
            {authCopy.logoutError}
          </p>
        )}
        <button
          className="auth-secondary"
          disabled={auth.logoutState === 'pending'}
          onClick={() =>
            void auth
              .logout()
              .then(() =>
                navigate('/entry', {
                  replace: true,
                  state: { focusHeading: true },
                }),
              )
              .catch(() => undefined)
          }
        >
          {auth.logoutState === 'pending' ? '로그아웃 중...' : '로그아웃'}
        </button>
      </div>
    )
  if (auth.status === 'checking' || auth.status === 'checkError')
    return <AuthStatus />
  if (auth.status === 'authenticated')
    return (
      <div className="auth-controls">
        <button
          className="auth-secondary"
          onClick={() =>
            void auth
              .logout()
              .then(() =>
                navigate('/entry', {
                  replace: true,
                  state: { focusHeading: true },
                }),
              )
              .catch(() => undefined)
          }
        >
          로그아웃
        </button>
      </div>
    )
  return (
    <div className="auth-controls">
      <span>이미 계정이 있으신가요?</span>
      <button className="auth-secondary" onClick={() => navigate('/login')}>
        로그인하기
      </button>
    </div>
  )
}
