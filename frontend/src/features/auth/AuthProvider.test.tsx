import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { AuthProvider } from './AuthProvider'
import { useAuth } from './useAuth'

function AuthConsumer() {
  const { accessToken, setAccessToken, clearAccessToken } = useAuth()

  return (
    <>
      <output>{accessToken ?? 'no-token'}</output>
      <button type="button" onClick={() => setAccessToken('access-token')}>
        token 저장
      </button>
      <button type="button" onClick={clearAccessToken}>
        token 삭제
      </button>
    </>
  )
}

describe('AuthProvider', () => {
  it('Access Token을 memory에 저장하고 제거한다', async () => {
    const user = userEvent.setup()
    render(
      <AuthProvider>
        <AuthConsumer />
      </AuthProvider>,
    )

    expect(screen.getByText('no-token')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'token 저장' }))
    expect(screen.getByText('access-token')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'token 삭제' }))
    expect(screen.getByText('no-token')).toBeInTheDocument()
  })
})
