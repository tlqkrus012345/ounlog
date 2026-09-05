import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import BirthTimePage from './BirthTimePage'

const PREVIOUS_STATE = {
  birthDate: '1998-08-21',
  calendarType: 'SOLAR',
}

function StateDisplay() {
  const location = useLocation()
  return (
    <output data-testid="route-state">{JSON.stringify(location.state)}</output>
  )
}

function renderBirthTimePage() {
  return render(
    <MemoryRouter
      initialEntries={[{ pathname: '/saju/birth-time', state: PREVIOUS_STATE }]}
    >
      <Routes>
        <Route path="/saju/birth-time" element={<BirthTimePage />} />
        <Route path="/saju/confirm" element={<StateDisplay />} />
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
})
