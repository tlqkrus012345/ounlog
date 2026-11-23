import { Link } from 'react-router-dom'
import { authCopy } from './copy'
import { useAuth } from './useAuth'

export function AuthStatus() {
  const auth = useAuth()
  const failed = auth.status === 'checkError'
  return (
    <div className="auth-status" role="status">
      <p>{failed ? authCopy.checkError : authCopy.checking}</p>
      {failed && (
        <button className="auth-secondary" onClick={() => void auth.retry()}>
          다시 시도
        </button>
      )}
      {failed && auth.signInRequired && (
        <Link
          className="auth-secondary"
          to="/login"
          state={{ reason: 'refresh-uncertain' }}
        >
          로그인
        </Link>
      )}
    </div>
  )
}
