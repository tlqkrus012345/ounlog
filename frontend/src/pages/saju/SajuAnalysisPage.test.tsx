import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import SajuAnalysisPage from './SajuAnalysisPage'

function SajuDestination() {
  return <output data-testid="location">{useLocation().pathname}</output>
}

describe('SajuAnalysisPage', () => {
  it('Full Analysis 결과를 표시한다', () => {
    render(
      <MemoryRouter
        initialEntries={[
          {
            pathname: '/saju/analysis',
            state: {
              result: '전체 사주 분석 결과입니다.',
              status: 'CREATED',
            },
          },
        ]}
      >
        <Routes>
          <Route path="/saju/analysis" element={<SajuAnalysisPage />} />
        </Routes>
      </MemoryRouter>,
    )

    expect(screen.getByText('사주 분석이 완료되었습니다.')).toBeInTheDocument()
    expect(screen.getByText('전체 사주 분석 결과입니다.')).toBeInTheDocument()
    expect(
      screen.queryByText('이미 분석이 완료된 결과가 있습니다.'),
    ).not.toBeInTheDocument()
  })

  it('기존 Full Analysis 결과임을 안내한다', () => {
    render(
      <MemoryRouter
        initialEntries={[
          {
            pathname: '/saju/analysis',
            state: {
              result: '기존 전체 사주 분석 결과입니다.',
              status: 'EXISTING',
            },
          },
        ]}
      >
        <Routes>
          <Route path="/saju/analysis" element={<SajuAnalysisPage />} />
        </Routes>
      </MemoryRouter>,
    )

    expect(screen.getByRole('status')).toHaveTextContent(
      '이미 분석이 완료된 결과가 있습니다.',
    )
    expect(
      screen.getByText('기존 전체 사주 분석 결과입니다.'),
    ).toBeInTheDocument()
  })

  it('분석 결과 state가 없으면 사주 입력 페이지로 이동한다', () => {
    render(
      <MemoryRouter initialEntries={['/saju/analysis']}>
        <Routes>
          <Route path="/saju/analysis" element={<SajuAnalysisPage />} />
          <Route path="/saju" element={<SajuDestination />} />
        </Routes>
      </MemoryRouter>,
    )

    expect(screen.getByTestId('location')).toHaveTextContent('/saju')
  })
})
