import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
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

  it('전체 사주 분석 보기를 누르면 회원가입 화면으로 이동한다', async () => {
    const user = userEvent.setup()

    render(
      <MemoryRouter
        initialEntries={[
          {
            pathname: '/saju/preview',
            state: {
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

    await user.click(
      screen.getByRole('button', { name: '전체 사주 분석 보기' }),
    )

    expect(screen.getByTestId('location')).toHaveTextContent('/signup')
  })
})
