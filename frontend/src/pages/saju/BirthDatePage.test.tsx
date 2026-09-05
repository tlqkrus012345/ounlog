import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import BirthDatePage from './BirthDatePage'

function StateDisplay() {
  const location = useLocation()
  return (
    <output data-testid="route-state">{JSON.stringify(location.state)}</output>
  )
}

describe('BirthDatePage', () => {
  it('생년월일을 입력하기 전에는 다음 단계로 진행할 수 없다', () => {
    render(
      <MemoryRouter initialEntries={['/saju']}>
        <Routes>
          <Route path="/saju" element={<BirthDatePage />} />
        </Routes>
      </MemoryRouter>,
    )

    expect(screen.getByRole('button', { name: '다음' })).toBeDisabled()
  })

  it('생년월일과 달력 유형을 다음 단계의 state로 전달한다', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter initialEntries={['/saju']}>
        <Routes>
          <Route path="/saju" element={<BirthDatePage />} />
          <Route path="/saju/birth-time" element={<StateDisplay />} />
        </Routes>
      </MemoryRouter>,
    )

    fireEvent.change(screen.getByLabelText('생년월일'), {
      target: { value: '1998-08-21' },
    })
    await user.click(screen.getByRole('button', { name: '음력' }))
    await user.click(screen.getByRole('button', { name: '다음' }))

    expect(screen.getByTestId('route-state')).toHaveTextContent(
      JSON.stringify({ birthDate: '1998-08-21', calendarType: 'LUNAR' }),
    )
  })
})
