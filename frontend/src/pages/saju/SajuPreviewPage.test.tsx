import {
  act,
  render as renderView,
  screen,
  waitFor,
} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {
  MemoryRouter,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { StrictMode, type ReactElement } from 'react'
import { AuthProvider } from '../../features/auth/AuthProvider'
import SajuPreviewPage from './SajuPreviewPage'
import * as sajuApi from '../../features/saju/api'
import { authRuntime } from '../../features/auth/runtime'
import { saveSajuForm } from '../../features/saju/storage'
import { server } from '../../test/server'
import { http, HttpResponse } from 'msw'
import { tokenResponse } from '../../test/authFixture'
import { sajuAnalysisResponse } from '../../test/sajuAnalysisFixture'
import type { SajuAnalysisCreationResult } from '../../features/saju/types'

function render(ui: ReactElement) {
  return renderView(<AuthProvider>{ui}</AuthProvider>)
}

function SajuDestination() {
  return <output data-testid="location">{useLocation().pathname}</output>
}

describe('SajuPreviewPage', () => {
  it('분석 결과 state가 없으면 사주 입력 페이지로 이동한다', () => {
    render(
      <MemoryRouter initialEntries={['/saju/preview']}>
        <Routes>
          <Route path="/saju/preview" element={<SajuPreviewPage />} />
          <Route path="/saju" element={<SajuDestination />} />
        </Routes>
      </MemoryRouter>,
    )

    expect(screen.getByTestId('location')).toHaveTextContent('/saju')
  })

  it('전체 사주 분석 보기를 누르면 회원가입 화면으로 이동한다', async () => {
    const user = userEvent.setup()

    render(
      <MemoryRouter
        initialEntries={[
          {
            pathname: '/saju/preview',
            state: {
              year: 2026,
              keyword: '전환',
              summary: '새로운 변화를 시도하기 좋은 흐름입니다.',
            },
          },
        ]}
      >
        <Routes>
          <Route path="/saju/preview" element={<SajuPreviewPage />} />
          <Route path="/signup" element={<SajuDestination />} />
        </Routes>
      </MemoryRouter>,
    )

    expect(screen.getByText('2026년 당신의 핵심 키워드는')).toBeInTheDocument()

    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: '전체 사주 분석 보기' }),
      ).toBeEnabled(),
    )
    await user.click(
      screen.getByRole('button', { name: '전체 사주 분석 보기' }),
    )

    expect(screen.getByTestId('location')).toHaveTextContent('/signup')
  })
})

const preview = { year: 2026, keyword: '전환', summary: '미리보기 결과' }
it.each([
  { resumed: true, focusHeading: true },
  { ...preview, year: '2026', resumed: true },
  { ...preview, keyword: ' ', resumed: true },
  { ...preview, summary: '', resumed: true },
])('표시할 수 없는 복귀 결과는 선택 화면으로 이동한다: %j', (state) => {
  render(
    <MemoryRouter initialEntries={[{ pathname: '/saju/preview', state }]}>
      <Routes>
        <Route path="/saju/preview" element={<SajuPreviewPage />} />
        <Route path="/entry" element={<SajuDestination />} />
      </Routes>
    </MemoryRouter>,
  )
  expect(screen.getByTestId('location')).toHaveTextContent('/entry')
})

function Navigation() {
  const navigate = useNavigate()
  return (
    <>
      <output data-testid="path">{useLocation().pathname}</output>
      <button onClick={() => navigate(-1)}>뒤로 이동</button>
      <button onClick={() => navigate('/entry')}>선택 화면 이동</button>
      <button onClick={() => navigate('/saju/preview', { state: preview })}>
        미리보기 재진입
      </button>
    </>
  )
}

it.each([
  ['success', 'back'],
  ['failure', 'back'],
  ['success', 'entry'],
  ['failure', 'entry'],
  ['success', 'reenter'],
  ['failure', 'reenter'],
  ['success', 'current'],
  ['failure', 'current'],
  ['success', 'same-route'],
  ['failure', 'same-route'],
] as const)(
  '분석의 %s 응답은 요청을 시작한 화면이 유효할 때만 반영한다 (%s)',
  async (outcome, destination) => {
    server.use(
      http.post('/v1/auth/login', () => HttpResponse.json(tokenResponse())),
    )
    await authRuntime.login({
      email: 'member@example.com',
      password: 'password123',
    })
    saveSajuForm({
      birthDate: '1995-03-21',
      birthTime: '14:30',
      calendarType: 'SOLAR',
      gender: 'MALE',
      isLeapMonth: false,
    })
    let resolve!: (value: SajuAnalysisCreationResult) => void
    let reject!: (error: Error) => void
    const response = new Promise<SajuAnalysisCreationResult>((yes, no) => {
      resolve = yes
      reject = no
    })
    const request = vi
      .spyOn(sajuApi, 'createSajuAnalysis')
      .mockReturnValueOnce(response)
    try {
      render(
        <StrictMode>
          <MemoryRouter
            initialEntries={[
              '/saju/confirm',
              { pathname: '/saju/preview', state: preview },
            ]}
          >
            <Navigation />
            <Routes>
              <Route path="/saju/preview" element={<SajuPreviewPage />} />
              <Route path="/saju/confirm" element={<h1>확인 화면</h1>} />
              <Route path="/entry" element={<h1>선택 화면</h1>} />
              <Route path="/saju/analysis" element={<h1>분석 결과</h1>} />
            </Routes>
          </MemoryRouter>
        </StrictMode>,
      )
      const user = userEvent.setup()
      await user.click(
        screen.getByRole('button', { name: '전체 사주 분석 보기' }),
      )
      expect(request).toHaveBeenCalledTimes(1)
      if (destination !== 'current' && destination !== 'same-route')
        await user.click(
          screen.getByRole('button', {
            name: destination === 'entry' ? '선택 화면 이동' : '뒤로 이동',
          }),
        )
      if (destination === 'reenter' || destination === 'same-route')
        await user.click(
          screen.getByRole('button', { name: '미리보기 재진입' }),
        )
      await act(async () => {
        if (outcome === 'success')
          resolve({ ...sajuAnalysisResponse(), status: 'CREATED' })
        else reject(new Error('delayed failure'))
        await response.catch(() => undefined)
      })
      const expected =
        destination === 'current' && outcome === 'success'
          ? '/saju/analysis'
          : destination === 'back'
            ? '/saju/confirm'
            : destination === 'entry'
              ? '/entry'
              : '/saju/preview'
      expect(screen.getByTestId('path')).toHaveTextContent(expected)
      if (destination === 'current' && outcome === 'failure')
        expect(screen.getByRole('alert')).toHaveTextContent(
          '분석 중 문제가 발생했습니다.',
        )
      else expect(screen.queryByRole('alert')).not.toBeInTheDocument()
      if (destination === 'reenter' || destination === 'same-route')
        expect(
          screen.getByRole('button', { name: '전체 사주 분석 보기' }),
        ).toBeEnabled()
      expect(request).toHaveBeenCalledTimes(1)
    } finally {
      request.mockRestore()
    }
  },
)
