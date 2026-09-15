import { useLocation } from 'react-router-dom'

interface LoginLocationState {
  message?: string
}

function LoginPage() {
  const location = useLocation()
  const state = location.state as LoginLocationState | null

  return (
    <main>
      <h1>로그인</h1>
      {state?.message && <p role="status">{state.message}</p>}
    </main>
  )
}

export default LoginPage
