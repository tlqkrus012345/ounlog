import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { StrictMode } from 'react'
import { MemoryRouter, useLocation, useNavigate } from 'react-router-dom'
import { http, HttpResponse } from 'msw'
import { it, expect, vi } from 'vitest'
import { authRuntime } from './runtime'
import { AuthProvider } from './AuthProvider'
import { authCopy } from './copy'
import { server } from '../../test/server'
import { tokenResponse, authError } from '../../test/authFixture'
import { AppRoutes } from '../../routes/AppRoutes'
import { createRecovery } from '../saju/recovery'
import { readDraft, saveSajuDraft, saveSajuForm } from '../saju/storage'

const input = {
  birthDate: '1995-03-21',
  birthTime: '14:30',
  calendarType: 'SOLAR',
  gender: 'MALE',
  isLeapMonth: false,
} as const
function Navigation() {
  const navigate = useNavigate()
  return (
    <>
      <output data-testid="path">{useLocation().pathname}</output>
      <button onClick={() => navigate(-1)}>테스트 뒤로</button>
      <button onClick={() => navigate('/login')}>테스트 로그인 재진입</button>
    </>
  )
}
function show(path = '/saju/confirm') {
  return render(
    <StrictMode>
      <AuthProvider>
        <MemoryRouter initialEntries={['/entry', path]}>
          <Navigation />
          <AppRoutes />
        </MemoryRouter>
      </AuthProvider>
    </StrictMode>,
  )
}
function records() {
  return Object.keys(localStorage).filter((key) =>
    key.startsWith('ounlog-recovery:'),
  )
}
async function submit(email = 'member@example.com') {
  const user = userEvent.setup()
  await user.type(await screen.findByLabelText('이메일'), email)
  await user.type(screen.getByLabelText('비밀번호'), 'password123')
  await user.click(screen.getByRole('button', { name: '로그인' }))
}
it.each(['success', 'failure'])(
  '로그인 재진입 시 이전 %s 요청이 끝날 때까지 새 제출을 차단한다',
  async (outcome) => {
    let finish!: () => void
    let started!: () => void
    const waiting = new Promise<void>((done) => {
      finish = done
    })
    const sent = new Promise<void>((done) => {
      started = done
    })
    const emails: string[] = []
    server.use(
      http.post('/v1/auth/login', async ({ request }) => {
        const body = (await request.json()) as { email: string }
        emails.push(body.email)
        if (emails.length === 1) {
          started()
          await waiting
          return outcome === 'success'
            ? HttpResponse.json(tokenResponse('1'))
            : authError('INVALID_CREDENTIALS')
        }
        return HttpResponse.json(tokenResponse('2'))
      }),
    )
    show('/login')
    await submit()
    await sent
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: '테스트 뒤로' }))
    await user.click(
      screen.getByRole('button', { name: '테스트 로그인 재진입' }),
    )
    try {
      expect(
        screen.getByRole('button', { name: '로그인 중...' }),
      ).toBeDisabled()
      fireEvent.change(screen.getByLabelText('이메일'), {
        target: { value: 'other@example.com' },
      })
      fireEvent.change(screen.getByLabelText('비밀번호'), {
        target: { value: 'password123' },
      })
      fireEvent.submit(screen.getByLabelText('이메일').closest('form')!)
      await act(async () => finish())
      if (outcome === 'success')
        await waitFor(() =>
          expect(screen.getByTestId('path')).toHaveTextContent('/entry'),
        )
      else {
        await waitFor(() =>
          expect(screen.getByRole('button', { name: '로그인' })).toBeEnabled(),
        )
        expect(screen.queryByText(authCopy.rejected)).not.toBeInTheDocument()
        await user.clear(screen.getByLabelText('이메일'))
        await user.clear(screen.getByLabelText('비밀번호'))
        await submit('other@example.com')
        await waitFor(() =>
          expect(screen.getByTestId('path')).toHaveTextContent('/entry'),
        )
      }
      expect(emails).toEqual(
        outcome === 'success'
          ? ['member@example.com']
          : ['member@example.com', 'other@example.com'],
      )
    } finally {
      finish()
    }
  },
)

it.each(['1', '2'])(
  'Cookie와 탭 저장소가 없어도 회원 %s 확인 전 복구 입력을 숨기고 같은 회원만 복원한다',
  async (memberId) => {
    const record = createRecovery('1', '/saju/confirm', input)!
    sessionStorage.clear()
    let analyses = 0
    server.use(
      http.post('/v1/auth/login', () =>
        HttpResponse.json(tokenResponse(memberId)),
      ),
      http.post('/v1/saju/analysis', () => {
        analyses++
        return HttpResponse.json({})
      }),
    )
    show()
    expect(screen.queryByText(input.birthDate)).not.toBeInTheDocument()
    await waitFor(() =>
      expect(screen.getByTestId('path')).toHaveTextContent('/login'),
    )
    expect(screen.queryByText(input.birthDate)).not.toBeInTheDocument()
    await submit(memberId === '1' ? 'member@example.com' : 'other@example.com')
    await waitFor(() =>
      expect(screen.getByTestId('path')).toHaveTextContent(
        memberId === '1' ? '/saju/confirm' : '/entry',
      ),
    )
    if (memberId === '1') {
      expect(screen.getByText(input.birthDate)).toBeInTheDocument()
      expect(readDraft()?.ownerMemberId).toBe('1')
    } else {
      expect(screen.queryByText(input.birthDate)).not.toBeInTheDocument()
      expect(readDraft()).toBeNull()
    }
    expect(localStorage.getItem('ounlog-recovery:' + record.id)).toBeNull()
    expect(analyses).toBe(0)
  },
)

it.each(['ambiguous', 'expired', 'damaged', 'incomplete'])(
  'Cookie 없는 재접속의 %s 기록은 삭제하고 선택 화면으로 이동한다',
  async (kind) => {
    const record = createRecovery('1', '/saju/confirm', input)!
    sessionStorage.clear()
    if (kind === 'ambiguous')
      createRecovery('1', '/saju/confirm', { ...input, birthTime: '01:00' })
    if (kind === 'expired') record.createdAt = Date.now() - 24 * 3600_000
    if (kind === 'damaged') record.input.birthDate = '2026-02-30'
    if (kind === 'incomplete') record.input = { birthDate: input.birthDate }
    localStorage.setItem('ounlog-recovery:' + record.id, JSON.stringify(record))
    sessionStorage.clear()
    show()
    await waitFor(() =>
      expect(screen.getByTestId('path')).toHaveTextContent('/entry'),
    )
    expect(records()).toHaveLength(0)
    expect(screen.queryByText(input.birthDate)).not.toBeInTheDocument()
  },
)

it.each(['other-path', 'same-path'])(
  '선택한 후보를 로그인까지 유지하고 다른 작업과 혼동하지 않는다 (%s)',
  async (kind) => {
    const selected = createRecovery('1', '/saju/confirm', input)!
    sessionStorage.clear()
    const other = createRecovery(
      '1',
      kind === 'same-path' ? '/saju/confirm' : '/saju/birth-time',
      { ...input, birthDate: '2000-01-01' },
    )!
    sessionStorage.clear()
    if (kind === 'same-path')
      sessionStorage.setItem('ounlog-recovery-current', selected.id)
    server.use(
      http.post('/v1/auth/login', () => HttpResponse.json(tokenResponse())),
    )
    show()
    await waitFor(() =>
      expect(screen.getByTestId('path')).toHaveTextContent('/login'),
    )
    await submit()
    await waitFor(() =>
      expect(screen.getByTestId('path')).toHaveTextContent('/saju/confirm'),
    )
    expect(screen.getByText(input.birthDate)).toBeInTheDocument()
    expect(localStorage.getItem('ounlog-recovery:' + selected.id)).toBeNull()
    expect(localStorage.getItem('ounlog-recovery:' + other.id)).not.toBeNull()
  },
)

it('복구 기록이 없으면 로그인 강제 없이 기존 공개 입력 흐름을 유지한다', async () => {
  show('/saju')
  expect(await screen.findByLabelText('생년월일')).toBeInTheDocument()
  expect(screen.getByTestId('path')).toHaveTextContent('/saju')
})

it.each(['1', '2'])(
  '유효한 Cookie로 회원 %s가 확인되면 복구 대상을 한 번만 처리한다',
  async (memberId) => {
    createRecovery('1', '/saju/confirm', input)
    sessionStorage.clear()
    server.use(
      http.post('/v1/auth/refresh', () =>
        HttpResponse.json(tokenResponse(memberId)),
      ),
    )
    show()
    expect(screen.queryByText(input.birthDate)).not.toBeInTheDocument()
    await waitFor(() =>
      expect(screen.getByTestId('path')).toHaveTextContent(
        memberId === '1' ? '/saju/confirm' : '/entry',
      ),
    )
    if (memberId === '1')
      expect(await screen.findByText(input.birthDate)).toBeInTheDocument()
    else expect(screen.queryByText(input.birthDate)).not.toBeInTheDocument()
    expect(records()).toHaveLength(0)
  },
)

it('인증 확인 실패 중에는 복구 입력을 숨기고 기록 기한을 유지하며 재시도한다', async () => {
  const record = createRecovery('1', '/saju/confirm', input)!
  sessionStorage.clear()
  let calls = 0
  server.use(
    http.post('/v1/auth/refresh', () =>
      ++calls === 1
        ? authError('INTERNAL_SERVER_ERROR', 500)
        : authError('AUTHENTICATION_REQUIRED'),
    ),
  )
  show()
  expect(await screen.findByText(authCopy.checkError)).toBeInTheDocument()
  expect(screen.queryByText(input.birthDate)).not.toBeInTheDocument()
  expect(
    JSON.parse(localStorage.getItem('ounlog-recovery:' + record.id)!).createdAt,
  ).toBe(record.createdAt)
  await userEvent.click(screen.getByRole('button', { name: '다시 시도' }))
  await waitFor(() =>
    expect(screen.getByTestId('path')).toHaveTextContent('/login'),
  )
})

it('현재 회원이 편집 중인 초안을 별도 복구 후보로 덮어쓰지 않는다', async () => {
  server.use(
    http.post('/v1/auth/login', () => HttpResponse.json(tokenResponse())),
  )
  await authRuntime.login({
    email: 'member@example.com',
    password: 'password123',
  })
  const record = createRecovery('1', '/saju/confirm', {
    ...input,
    birthDate: '2000-01-01',
  })!
  saveSajuForm(input)
  show()
  expect(await screen.findByText(input.birthDate)).toBeInTheDocument()
  expect(screen.queryByText('2000-01-01')).not.toBeInTheDocument()
  expect(localStorage.getItem('ounlog-recovery:' + record.id)).not.toBeNull()
})

it.each(['AUTHENTICATION_REQUIRED', 'SESSION_EXPIRED'])(
  '인증 확인 중 현재 초안을 숨기고 %s 후에도 다른 작업으로 바꾸지 않는다',
  async (code) => {
    const other = createRecovery('1', '/saju/confirm', {
      ...input,
      birthDate: '2000-01-01',
    })!
    saveSajuDraft(input, '1')
    server.use(
      http.post('/v1/auth/refresh', () => authError(code)),
      http.post('/v1/auth/login', () => HttpResponse.json(tokenResponse())),
    )
    show()
    expect(screen.queryByText(input.birthDate)).not.toBeInTheDocument()
    expect(screen.queryByText('2000-01-01')).not.toBeInTheDocument()
    await waitFor(() =>
      expect(screen.getByTestId('path')).toHaveTextContent('/login'),
    )
    await submit()
    await waitFor(() =>
      expect(screen.getByTestId('path')).toHaveTextContent('/saju/confirm'),
    )
    expect(screen.getByText(input.birthDate)).toBeInTheDocument()
    expect(screen.queryByText('2000-01-01')).not.toBeInTheDocument()
    expect(localStorage.getItem('ounlog-recovery:' + other.id)).not.toBeNull()
  },
)

it('인증된 탭이 만료되어도 현재 작업을 다른 복구 후보보다 우선한다', async () => {
  server.use(
    http.post('/v1/auth/login', () => HttpResponse.json(tokenResponse())),
    http.get('/v1/auth/session', () => authError('SESSION_EXPIRED')),
  )
  await authRuntime.login({
    email: 'member@example.com',
    password: 'password123',
  })
  createRecovery('1', '/saju/confirm', { ...input, birthDate: '2000-01-01' })
  saveSajuForm(input)
  show()
  expect(await screen.findByText(input.birthDate)).toBeInTheDocument()
  await act(async () => authRuntime.verify())
  await waitFor(() =>
    expect(screen.getByTestId('path')).toHaveTextContent('/login'),
  )
  expect(screen.queryByText(input.birthDate)).not.toBeInTheDocument()
  await submit()
  await waitFor(() =>
    expect(screen.getByTestId('path')).toHaveTextContent('/saju/confirm'),
  )
  expect(screen.getByText(input.birthDate)).toBeInTheDocument()
  expect(screen.queryByText('2000-01-01')).not.toBeInTheDocument()
})

it('재로그인 후 초안 저장 실패는 복구 성공 안내 없이 선택 화면으로 이동한다', async () => {
  const record = createRecovery('1', '/saju/confirm', input)!
  sessionStorage.clear()
  server.use(
    http.post('/v1/auth/login', () => HttpResponse.json(tokenResponse())),
  )
  show()
  await waitFor(() =>
    expect(screen.getByTestId('path')).toHaveTextContent('/login'),
  )
  const setItem = Storage.prototype.setItem
  const spy = vi
    .spyOn(Storage.prototype, 'setItem')
    .mockImplementation(function (this: Storage, key, value) {
      if (this === sessionStorage && key === 'saju-form')
        throw new DOMException('full', 'QuotaExceededError')
      setItem.call(this, key, value)
    })
  try {
    await submit()
    await waitFor(() =>
      expect(screen.getByTestId('path')).toHaveTextContent('/entry'),
    )
    expect(screen.queryByText(authCopy.resume)).not.toBeInTheDocument()
    expect(readDraft()).toBeNull()
    expect(localStorage.getItem('ounlog-recovery:' + record.id)).not.toBeNull()
  } finally {
    spy.mockRestore()
  }
})

it('작업 ID 없는 기존 초안도 다른 기존 기록에 연결하지 않고 보존한다', async () => {
  const other = createRecovery('1', '/saju/confirm', {
    ...input,
    birthDate: '2000-01-01',
  })!
  const legacy = JSON.parse(
    localStorage.getItem('ounlog-recovery:' + other.id)!,
  )
  delete legacy.workId
  localStorage.setItem('ounlog-recovery:' + other.id, JSON.stringify(legacy))
  sessionStorage.setItem(
    'saju-form',
    JSON.stringify({ input, ownerMemberId: '1' }),
  )
  server.use(
    http.post('/v1/auth/login', () => HttpResponse.json(tokenResponse())),
  )
  show()
  await waitFor(() =>
    expect(screen.getByTestId('path')).toHaveTextContent('/login'),
  )
  expect(readDraft()?.workId).toBeTruthy()
  await submit()
  await waitFor(() =>
    expect(screen.getByTestId('path')).toHaveTextContent('/saju/confirm'),
  )
  expect(screen.getByText(input.birthDate)).toBeInTheDocument()
  expect(readDraft()?.workId).not.toBe(other.id)
})

it.each(['1', '2'])(
  '현재 초안을 숨긴 상태로 Cookie의 회원 %s를 확인하고 소유권을 검증한다',
  async (memberId) => {
    createRecovery('1', '/saju/confirm', { ...input, birthDate: '2000-01-01' })
    saveSajuDraft(input, '1')
    server.use(
      http.post('/v1/auth/refresh', () =>
        HttpResponse.json(tokenResponse(memberId)),
      ),
    )
    show()
    expect(screen.queryByText(input.birthDate)).not.toBeInTheDocument()
    expect(screen.queryByText('2000-01-01')).not.toBeInTheDocument()
    await waitFor(() =>
      expect(screen.getByTestId('path')).toHaveTextContent(
        memberId === '1' ? '/saju/confirm' : '/entry',
      ),
    )
    if (memberId === '1')
      expect(await screen.findByText(input.birthDate)).toBeInTheDocument()
    else {
      expect(readDraft()).toBeNull()
      expect(records()).toHaveLength(0)
      expect(screen.queryByText(input.birthDate)).not.toBeInTheDocument()
    }
  },
)

it('현재 초안은 인증 확인 실패·재시도 중에도 입력과 작업 ID를 유지한다', async () => {
  const other = createRecovery('1', '/saju/confirm', {
    ...input,
    birthDate: '2000-01-01',
  })!
  saveSajuDraft(input, '1')
  const draft = sessionStorage.getItem('saju-form')
  let calls = 0
  server.use(
    http.post('/v1/auth/refresh', () =>
      ++calls === 1
        ? authError('INTERNAL_SERVER_ERROR', 500)
        : authError('SESSION_EXPIRED'),
    ),
    http.post('/v1/auth/login', () => HttpResponse.json(tokenResponse())),
  )
  show()
  await screen.findAllByText(authCopy.checkError)
  expect(screen.queryByText(input.birthDate)).not.toBeInTheDocument()
  expect(screen.queryByText('2000-01-01')).not.toBeInTheDocument()
  expect(sessionStorage.getItem('saju-form')).toBe(draft)
  await userEvent.click(screen.getAllByRole('button', { name: '다시 시도' })[0])
  await waitFor(() =>
    expect(screen.getByTestId('path')).toHaveTextContent('/login'),
  )
  await submit()
  await waitFor(() =>
    expect(screen.getByTestId('path')).toHaveTextContent('/saju/confirm'),
  )
  expect(screen.getByText(input.birthDate)).toBeInTheDocument()
  expect(localStorage.getItem('ounlog-recovery:' + other.id)).not.toBeNull()
})

it.each(['SESSION_EXPIRED', 'SESSION_INVALID', 'AUTHENTICATION_REQUIRED'])(
  '초안·복구 기록 없는 결과 화면 재접속의 %s는 알맞은 로그인 안내 후 선택 화면으로 이동한다',
  async (code) => {
    let analysisRequests = 0
    server.use(
      http.post('/v1/auth/refresh', () => authError(code)),
      http.post('/v1/auth/login', () => HttpResponse.json(tokenResponse())),
      http.all('/v1/saju/analysis', () => {
        analysisRequests++
        return HttpResponse.json({})
      }),
    )
    show('/saju/analysis')
    await screen.findByLabelText('이메일')
    expect(screen.getByTestId('path')).toHaveTextContent('/login')
    if (code === 'AUTHENTICATION_REQUIRED')
      expect(screen.queryByText(authCopy.expired)).not.toBeInTheDocument()
    else expect(screen.getByText(authCopy.expired)).toBeInTheDocument()
    expect(records()).toHaveLength(0)
    await submit()
    await waitFor(() =>
      expect(screen.getByTestId('path')).toHaveTextContent('/entry'),
    )
    expect(screen.queryByText(authCopy.resume)).not.toBeInTheDocument()
    expect(readDraft()).toBeNull()
    expect(analysisRequests).toBe(0)
  },
)

it.each(['SESSION_EXPIRED', 'SESSION_INVALID', 'AUTHENTICATION_REQUIRED'])(
  '복구 대상 없는 %s 로그인은 다른 경로의 작업을 탐색하거나 소비하지 않는다',
  async (code) => {
    const other = createRecovery('1', '/saju/confirm', input)!
    sessionStorage.clear()
    server.use(
      http.post('/v1/auth/refresh', () => authError(code)),
      http.post('/v1/auth/login', () => HttpResponse.json(tokenResponse())),
    )
    show('/saju/analysis')
    await screen.findByLabelText('이메일')
    if (code === 'AUTHENTICATION_REQUIRED')
      expect(screen.queryByText(authCopy.expired)).not.toBeInTheDocument()
    await submit()
    await waitFor(() =>
      expect(screen.getByTestId('path')).toHaveTextContent('/entry'),
    )
    expect(localStorage.getItem('ounlog-recovery:' + other.id)).not.toBeNull()
    expect(readDraft()).toBeNull()
    expect(screen.queryByText(input.birthDate)).not.toBeInTheDocument()
  },
)

it.each(['record-write', 'legacy-draft'])(
  '만료 후 %s 저장 실패도 복구 없이 재로그인을 안내한다',
  async (failure) => {
    const other = createRecovery('1', '/saju/birth-time', {
      ...input,
      birthDate: '2000-01-01',
    })!
    if (failure === 'legacy-draft')
      sessionStorage.setItem(
        'saju-form',
        JSON.stringify({ input, ownerMemberId: '1' }),
      )
    else saveSajuDraft(input, '1')
    server.use(
      http.post('/v1/auth/refresh', () => authError('SESSION_EXPIRED')),
      http.post('/v1/auth/login', () => HttpResponse.json(tokenResponse())),
    )
    const setItem = Storage.prototype.setItem
    const spy = vi
      .spyOn(Storage.prototype, 'setItem')
      .mockImplementation(function (this: Storage, key, value) {
        if (
          (failure === 'legacy-draft' &&
            this === sessionStorage &&
            key === 'saju-form') ||
          (failure === 'record-write' &&
            this === localStorage &&
            key.startsWith('ounlog-recovery:'))
        )
          throw new DOMException('full', 'QuotaExceededError')
        setItem.call(this, key, value)
      })
    try {
      show()
      await screen.findByLabelText('이메일')
      expect(screen.getByTestId('path')).toHaveTextContent('/login')
      expect(screen.getByText(authCopy.expired)).toBeInTheDocument()
      expect(screen.queryByText(input.birthDate)).not.toBeInTheDocument()
      await submit()
      await waitFor(() =>
        expect(screen.getByTestId('path')).toHaveTextContent('/entry'),
      )
      expect(readDraft()).toBeNull()
      expect(localStorage.getItem('ounlog-recovery:' + other.id)).not.toBeNull()
    } finally {
      spy.mockRestore()
    }
  },
)

it.each(['expired', 'ambiguous'])(
  '만료가 확정되면 %s 복구 기록을 정리한 뒤 재로그인을 먼저 받는다',
  async (kind) => {
    const selected = createRecovery('1', '/saju/analysis', input)!
    if (kind === 'expired')
      localStorage.setItem(
        'ounlog-recovery:' + selected.id,
        JSON.stringify({ ...selected, createdAt: Date.now() - 24 * 3600_000 }),
      )
    else
      createRecovery('1', '/saju/analysis', {
        ...input,
        birthDate: '2000-01-01',
      })
    sessionStorage.clear()
    const other = createRecovery('1', '/saju/confirm', input)!
    sessionStorage.clear()
    server.use(
      http.post('/v1/auth/refresh', () => authError('SESSION_INVALID')),
      http.post('/v1/auth/login', () => HttpResponse.json(tokenResponse())),
    )
    show('/saju/analysis')
    await screen.findByLabelText('이메일')
    expect(screen.getByText(authCopy.expired)).toBeInTheDocument()
    expect(records()).toEqual(['ounlog-recovery:' + other.id])
    await submit()
    await waitFor(() =>
      expect(screen.getByTestId('path')).toHaveTextContent('/entry'),
    )
    expect(readDraft()).toBeNull()
    expect(localStorage.getItem('ounlog-recovery:' + other.id)).not.toBeNull()
  },
)

it.each(['SESSION_EXPIRED', 'SESSION_INVALID'])(
  '입력 없는 확인 화면도 %s 확정 후 빈 입력 화면으로 이탈하지 않고 로그인한다',
  async (code) => {
    server.use(http.post('/v1/auth/refresh', () => authError(code)))
    show()
    await screen.findByLabelText('이메일')
    expect(screen.getByTestId('path')).toHaveTextContent('/login')
    expect(screen.getByText(authCopy.expired)).toBeInTheDocument()
    expect(screen.queryByLabelText('생년월일')).not.toBeInTheDocument()
  },
)

it('복구 자료 없는 결과 화면의 서버 확인 오류는 만료 안내 없이 재시도를 제공한다', async () => {
  server.use(
    http.post('/v1/auth/refresh', () =>
      authError('INTERNAL_SERVER_ERROR', 500),
    ),
  )
  show('/saju/analysis')
  await screen.findAllByText(authCopy.checkError)
  expect(screen.getByTestId('path')).toHaveTextContent('/saju/analysis')
  expect(screen.queryByText(authCopy.expired)).not.toBeInTheDocument()
  expect(screen.queryByLabelText('이메일')).not.toBeInTheDocument()
  expect(
    screen.getAllByRole('button', { name: '다시 시도' }).length,
  ).toBeGreaterThan(0)
})
