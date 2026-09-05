import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import SajuPreviewPage from './SajuPreviewPage'

function SajuDestination() {
  return <output data-testid="location">{useLocation().pathname}</output>
}

describe('SajuPreviewPage', () => {
  it('분석 결과 state가 없으면 안내를 표시하고 다시 입력 페이지로 이동한다', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter initialEntries={['/saju/preview']}>
        <Routes>
          <Route path="/saju/preview" element={<SajuPreviewPage />} />
          <Route path="/saju" element={<SajuDestination />} />
        </Routes>
      </MemoryRouter>,
    )

    expect(
      screen.getByText('분석 결과를 찾을 수 없습니다.'),
    ).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '다시 분석하기' }))

    expect(screen.getByTestId('location')).toHaveTextContent('/saju')
  })
})
