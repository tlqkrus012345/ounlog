import { render, screen } from '@testing-library/react'
import { StrictMode } from 'react'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { AuthProvider } from './AuthProvider'
import { useAuth } from './useAuth'
import { server } from '../../test/server'
import { tokenResponse } from '../../test/authFixture'

function State() {
  const auth = useAuth()
  return (
    <output>
      {auth.status}:{auth.session?.memberId}
    </output>
  )
}
describe('AuthProvider', () => {
  it('StrictMode에서도 초기 복원을 한 번만 수행하고 회원을 확인한다', async () => {
    let calls = 0
    server.use(
      http.post('/v1/auth/refresh', () => {
        calls++
        return HttpResponse.json(tokenResponse())
      }),
    )
    render(
      <StrictMode>
        <AuthProvider>
          <State />
        </AuthProvider>
      </StrictMode>,
    )
    expect(await screen.findByText('authenticated:1')).toBeInTheDocument()
    expect(calls).toBe(1)
    expect(localStorage.getItem('accessToken')).toBeNull()
  })
  it('연결 오류를 미로그인으로 처리하지 않는다', async () => {
    server.use(http.post('/v1/auth/refresh', () => HttpResponse.error()))
    render(
      <AuthProvider>
        <State />
      </AuthProvider>,
    )
    expect(await screen.findByText('checkError:')).toBeInTheDocument()
  })
})
