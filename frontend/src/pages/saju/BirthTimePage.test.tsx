import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { getSajuForm, saveSajuForm } from '../../features/saju/storage'
import type { SajuFormState } from '../../features/saju/types'
import BirthTimePage from './BirthTimePage'

const PREVIOUS_STATE: Pick<SajuFormState, 'birthDate' | 'calendarType'> = {
  birthDate: '1998-08-21',
  calendarType: 'SOLAR',
}

function StateDisplay() {
  const location = useLocation()
  return (
    <output data-testid="route-state">{JSON.stringify(location.state)}</output>
  )
}

function renderBirthTimePage(
  state: Partial<SajuFormState> | null = PREVIOUS_STATE,
) {
  return render(
    <MemoryRouter initialEntries={[{ pathname: '/saju/birth-time', state }]}>
      <Routes>
        <Route path="/saju/birth-time" element={<BirthTimePage />} />
        <Route path="/saju/confirm" element={<StateDisplay />} />
        <Route path="/saju" element={<StateDisplay />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('BirthTimePage', () => {
  it('출생시간과 이전 단계 state를 다음 단계에 전달한다', async () => {
    const user = userEvent.setup()
    renderBirthTimePage()

    fireEvent.change(screen.getByLabelText('출생시간'), {
      target: { value: '14:32' },
    })
    await user.click(screen.getByRole('button', { name: '다음' }))

    expect(screen.getByTestId('route-state')).toHaveTextContent(
      JSON.stringify({
        ...PREVIOUS_STATE,
        birthTime: '14:32',
        birthTimeKnown: true,
      }),
    )
    expect(getSajuForm()).toEqual({
      ...PREVIOUS_STATE,
      birthTime: '14:32',
      birthTimeKnown: true,
    })
  })

  it('출생시간을 모르면 birthTime을 null로 전달한다', async () => {
    const user = userEvent.setup()
    renderBirthTimePage()

    await user.click(
      screen.getByRole('button', { name: '태어난 시간을 모르겠어요' }),
    )
    await user.click(screen.getByRole('button', { name: '다음' }))

    expect(screen.getByTestId('route-state')).toHaveTextContent(
      JSON.stringify({
        ...PREVIOUS_STATE,
        birthTime: null,
        birthTimeKnown: false,
      }),
    )
  })

  it('location.state가 없으면 sessionStorage의 입력값을 복구한다', () => {
    const storedForm: SajuFormState = {
      ...PREVIOUS_STATE,
      birthTime: '00:00',
      birthTimeKnown: true,
    }
    saveSajuForm(storedForm)

    renderBirthTimePage(null)

    expect(screen.getByLabelText('출생시간')).toHaveValue('00:00')
  })

  it('location.state와 저장 데이터가 모두 없으면 사주 입력 화면으로 이동한다', () => {
    renderBirthTimePage(null)

    expect(screen.getByTestId('route-state')).toHaveTextContent('null')
  })
})
