import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { sajuAnalysisResponse } from '../../test/sajuAnalysisFixture'
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
              ...sajuAnalysisResponse(),
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
      screen
        .getAllByRole('heading', { level: 2 })
        .map((heading) => heading.textContent),
    ).toEqual([
      '오행 분석',
      '올해 사주 총평',
      '성향 해석',
      '커리어 해석',
      '재물 해석',
      '관계 해석',
      '현재 대운 해석',
    ])
    expect(screen.getByText('기준 연도의 총평입니다.')).toBeInTheDocument()
    expect(screen.getByText('성향 해석입니다.')).toBeInTheDocument()
    expect(screen.getByText('커리어 해석입니다.')).toBeInTheDocument()
    expect(screen.getByText('재물 해석입니다.')).toBeInTheDocument()
    expect(screen.getByText('관계 해석입니다.')).toBeInTheDocument()
    expect(screen.getByText('생성 당시 대운 해석입니다.')).toBeInTheDocument()
    expect(screen.getByText('2026-10-17')).toHaveAttribute(
      'datetime',
      '2026-10-17',
    )
    expect(
      screen.getByText(/올해와 현재 대운은 생성 당시 기준입니다/),
    ).toBeInTheDocument()
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
              ...sajuAnalysisResponse('기존 전체 사주 분석 결과입니다.'),
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

  it('구형 문자열 결과는 보존하되 기준일과 문단을 임의로 만들지 않는다', () => {
    render(
      <MemoryRouter
        initialEntries={[
          {
            pathname: '/saju/analysis',
            state: {
              result: null,
              legacyResult: '구형 문자열 결과',
              asOfDate: null,
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

    expect(screen.getByText('구형 문자열 결과')).toBeInTheDocument()
    expect(screen.getByText(/해석 기준일 정보가 없습니다/)).toBeInTheDocument()
    expect(screen.queryAllByRole('heading', { level: 2 })).toHaveLength(0)
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
