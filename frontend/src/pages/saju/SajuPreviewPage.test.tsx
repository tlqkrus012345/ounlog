import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import SajuPreviewPage from './SajuPreviewPage'

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
})
