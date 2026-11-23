import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import LoginPage from './LoginPage'
import { AuthProvider } from '../../features/auth/AuthProvider'
import { authCopy } from '../../features/auth/copy'
import { server } from '../../test/server'
import { tokenResponse, authError } from '../../test/authFixture'
import { createRecovery, findRecovery } from '../../features/saju/recovery'
import { getSajuForm } from '../../features/saju/storage'

function DraftDestination() {
  return <output>{getSajuForm()?.birthDate}</output>
}

function show() {
  return render(
    <AuthProvider>
      <MemoryRouter initialEntries={['/login']}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/entry" element={<h1>서비스 선택</h1>} />
          <Route path="/saju/confirm" element={<DraftDestination />} />
        </Routes>
      </MemoryRouter>
    </AuthProvider>,
  )
}
async function fill() {
  const user = userEvent.setup()
  await screen.findByLabelText('이메일')
  await user.type(screen.getByLabelText('이메일'), 'member@example.com')
  await user.type(screen.getByLabelText('비밀번호'), 'password123')
  return user
}
describe('LoginPage', () => {
  it('빈 폼 제출은 네트워크 요청 없이 검증하고 첫 오류에 포커스한다', async () => {
    show()
    const button = await screen.findByRole('button', { name: '로그인' })
    expect(button).toBeEnabled()
    await userEvent.click(button)
    expect(screen.getByText(authCopy.emailRequired)).toBeInTheDocument()
    expect(screen.getByLabelText('이메일')).toHaveFocus()
  })
  it('정상 로그인은 서비스 선택으로 이동하며 분석을 자동 실행하지 않는다', async () => {
    let analyses = 0
    server.use(
      http.post('/v1/auth/login', () => HttpResponse.json(tokenResponse())),
      http.post('/v1/saju/analysis', () => {
        analyses++
        return HttpResponse.json({})
      }),
    )
    show()
    const user = await fill()
    await user.click(screen.getByRole('button', { name: '로그인' }))
    expect(
      await screen.findByRole('heading', { name: '서비스 선택' }),
    ).toBeInTheDocument()
    expect(analyses).toBe(0)
  })
  it('이미 로그인한 사용자는 폼을 보여주지 않고 선택 화면으로 이동한다', async () => {
    server.use(
      http.post('/v1/auth/refresh', () => HttpResponse.json(tokenResponse())),
    )
    show()
    expect(screen.queryByLabelText('비밀번호')).not.toBeInTheDocument()
    expect(await screen.findByText('서비스 선택')).toBeInTheDocument()
  })
  it('인증 실패는 공통 문구를 사용하고 입력은 유지한다', async () => {
    server.use(
      http.post('/v1/auth/login', () => authError('INVALID_CREDENTIALS')),
    )
    show()
    const user = await fill()
    await user.click(screen.getByRole('button', { name: '로그인' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(
      authCopy.rejected,
    )
    expect(screen.getByLabelText('비밀번호')).toHaveValue('password123')
    expect(screen.queryByText('Untrusted message')).not.toBeInTheDocument()
    await user.type(screen.getByLabelText('이메일'), 'a')
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
  it('처리 중 Enter와 submit 반복을 막는다', async () => {
    let finish!: () => void
    let calls = 0
    const waiting = new Promise<void>((r) => {
      finish = r
    })
    server.use(
      http.post('/v1/auth/login', async () => {
        calls++
        await waiting
        return authError('INVALID_CREDENTIALS')
      }),
    )
    show()
    const user = await fill()
    await user.click(screen.getByRole('button', { name: '로그인' }))
    fireEvent.submit(screen.getByLabelText('이메일').closest('form')!)
    expect(screen.getByRole('button', { name: '로그인 중...' })).toBeDisabled()
    await waitFor(() => expect(calls).toBe(1))
    await act(async () => finish())
    expect(await screen.findByRole('alert')).toHaveTextContent(
      authCopy.rejected,
    )
  })
  it('같은 회원으로 재로그인하면 입력을 복원하고 복귀 기록을 소비한다', async () => {
    createRecovery('1', '/saju/confirm', {
      birthDate: '1995-03-21',
      birthTime: '14:30',
      calendarType: 'SOLAR',
      gender: 'MALE',
      isLeapMonth: false,
    })
    server.use(
      http.post('/v1/auth/login', () => HttpResponse.json(tokenResponse())),
    )
    show()
    const user = await fill()
    await user.click(screen.getByRole('button', { name: '로그인' }))
    expect(await screen.findByText('1995-03-21')).toBeInTheDocument()
    expect(findRecovery()).toBeNull()
  })
  it('다른 회원이면 복원하지 않고 선택 화면으로 이동한다', async () => {
    createRecovery('1', '/saju/confirm', { birthDate: '1995-03-21' })
    server.use(
      http.post('/v1/auth/login', () => HttpResponse.json(tokenResponse('2'))),
    )
    show()
    const user = await fill()
    await user.click(screen.getByRole('button', { name: '로그인' }))
    expect(await screen.findByText('서비스 선택')).toBeInTheDocument()
    expect(findRecovery()).toBeNull()
  })
  it('확인 오류에서는 폼을 먼저 표시하거나 만료를 단정하지 않는다', async () => {
    server.use(http.get('/v1/auth/csrf', () => HttpResponse.error()))
    show()
    expect(await screen.findByText(authCopy.checkError)).toBeInTheDocument()
    expect(screen.queryByLabelText('비밀번호')).not.toBeInTheDocument()
    expect(screen.queryByText(authCopy.expired)).not.toBeInTheDocument()
  })
})

it('재발급 응답 유실 후 만료를 단정하지 않고 사용자가 직접 재로그인할 수 있다', async () => {
  server.use(
    http.post('/v1/auth/refresh', () => HttpResponse.error()),
    http.post('/v1/auth/login', () => HttpResponse.json(tokenResponse())),
  )
  show()
  expect(await screen.findByText(authCopy.checkError)).toBeInTheDocument()
  expect(screen.queryByText(authCopy.expired)).not.toBeInTheDocument()
  await userEvent.click(screen.getByRole('link', { name: '로그인' }))
  const user = await fill()
  await user.click(screen.getByRole('button', { name: '로그인' }))
  expect(await screen.findByText('서비스 선택')).toBeInTheDocument()
})
