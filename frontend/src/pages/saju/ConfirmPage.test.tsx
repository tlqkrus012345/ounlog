import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as sajuApi from '../../features/saju/api'
import { ApiTimeoutError } from '../../shared/api/errors'
import { saveSajuForm } from '../../features/saju/storage'
import type { SajuFormState } from '../../features/saju/types'
import ConfirmPage from './ConfirmPage'
import SajuPreviewPage from './SajuPreviewPage'

vi.mock('../../features/saju/api')

const FORM_STATE: SajuFormState = {
  birthDate: '1998-08-21',
  birthTime: '14:32',
  calendarType: 'SOLAR',
  gender: 'FEMALE',
  isLeapMonth: false,
}

function LocationDisplay() {
  return <output data-testid="location">{useLocation().pathname}</output>
}

function renderConfirmPage() {
  return render(
    <MemoryRouter
      initialEntries={[{ pathname: '/saju/confirm', state: FORM_STATE }]}
    >
      <Routes>
        <Route path="/saju/confirm" element={<ConfirmPage />} />
        <Route path="/saju/preview" element={<SajuPreviewPage />} />
      </Routes>
      <LocationDisplay />
    </MemoryRouter>,
  )
}

function renderConfirmPageWithoutLocationState() {
  return render(
    <MemoryRouter initialEntries={['/saju/confirm']}>
      <Routes>
        <Route path="/saju/confirm" element={<ConfirmPage />} />
        <Route path="/saju" element={<LocationDisplay />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('ConfirmPage', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('올바른 요청값으로 분석 API를 호출하고 Preview 페이지로 이동한다', async () => {
    vi.mocked(sajuApi.createSajuPreview).mockResolvedValue({
      year: 2026,
      keyword: '전환',
      summary: '올해는 새로운 변화를 시도하기 좋은 흐름이 나타납니다.',
    })
    const user = userEvent.setup()

    renderConfirmPage()
    await user.click(screen.getByRole('button', { name: '분석 시작하기' }))

    expect(sajuApi.createSajuPreview).toHaveBeenCalledWith({
      birthDate: '1998-08-21',
      birthTime: '14:32',
      calendarType: 'SOLAR',
      gender: 'FEMALE',
      isLeapMonth: false,
    })
    expect(await screen.findByText('전환')).toBeInTheDocument()
    expect(screen.getByTestId('location')).toHaveTextContent('/saju/preview')
    expect(
      screen.getByText('올해는 새로운 변화를 시도하기 좋은 흐름이 나타납니다.'),
    ).toBeInTheDocument()
  })

  it('분석 API가 실패하면 현재 페이지에 오류를 표시한다', async () => {
    vi.mocked(sajuApi.createSajuPreview).mockRejectedValue(
      new Error('network error'),
    )
    const user = userEvent.setup()

    renderConfirmPage()
    await user.click(screen.getByRole('button', { name: '분석 시작하기' }))

    expect(
      await screen.findByText('분석 중 문제가 발생했습니다.'),
    ).toBeInTheDocument()
    expect(screen.getByTestId('location')).toHaveTextContent('/saju/confirm')
    expect(
      screen.queryByRole('status', { name: '사주 분석 진행 상태' }),
    ).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: '분석 시작하기' })).toBeEnabled()
  })

  it('요청 시간이 초과되면 지연 안내와 다시 시도할 수 있는 버튼을 표시한다', async () => {
    vi.mocked(sajuApi.createSajuPreview).mockRejectedValue(
      new ApiTimeoutError(),
    )
    const user = userEvent.setup()

    renderConfirmPage()
    await user.click(screen.getByRole('button', { name: '분석 시작하기' }))

    expect(
      await screen.findByText(
        '분석이 지연되고 있습니다. 잠시 후 다시 시도해 주세요.',
      ),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('status', { name: '사주 분석 진행 상태' }),
    ).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: '분석 시작하기' })).toBeEnabled()
    expect(
      screen.getByRole('button', { name: '이전 단계로 이동' }),
    ).toBeEnabled()
  })

  it('location.state가 없으면 sessionStorage의 입력값을 복구한다', () => {
    saveSajuForm(FORM_STATE)

    renderConfirmPageWithoutLocationState()

    expect(screen.getByText('1998-08-21')).toBeInTheDocument()
    expect(screen.getByText('양력')).toBeInTheDocument()
    expect(screen.getByText('14:32')).toBeInTheDocument()
    expect(screen.getByText('여성')).toBeInTheDocument()
  })

  it('location.state와 저장 데이터가 모두 없으면 사주 입력 화면으로 이동한다', () => {
    renderConfirmPageWithoutLocationState()

    expect(screen.getByTestId('location')).toHaveTextContent('/saju')
  })

  it('분석 중에는 버튼을 비활성화하여 중복 요청을 방지한다', async () => {
    let resolveRequest: (() => void) | undefined
    vi.mocked(sajuApi.createSajuPreview).mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveRequest = () =>
            resolve({
              year: 2026,
              keyword: '전환',
              summary: '분석 결과입니다.',
            })
        }),
    )
    const user = userEvent.setup()

    renderConfirmPage()
    await user.click(screen.getByRole('button', { name: '분석 시작하기' }))

    const loadingButton = screen.getByRole('button', { name: '분석 중...' })
    expect(
      screen.getByRole('status', { name: '사주 분석 진행 상태' }),
    ).toHaveTextContent('올해의 흐름을 해석하는 중')
    expect(
      screen.getByRole('button', { name: '이전 단계로 이동' }),
    ).toBeDisabled()
    expect(loadingButton).toBeDisabled()
    await user.click(loadingButton)
    expect(sajuApi.createSajuPreview).toHaveBeenCalledTimes(1)

    resolveRequest?.()
    await waitFor(() => {
      expect(screen.getByTestId('location')).toHaveTextContent('/saju/preview')
    })
  })
})
