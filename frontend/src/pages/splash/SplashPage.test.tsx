import { act, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import SplashPage from './SplashPage'

function EntryDestination() {
  const location = useLocation()
  return <output data-testid="location">{location.pathname}</output>
}

describe('SplashPage', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('1초 후 entry 페이지로 이동한다', async () => {
    vi.useFakeTimers()
    render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="/" element={<SplashPage />} />
          <Route path="/entry" element={<EntryDestination />} />
        </Routes>
      </MemoryRouter>,
    )

    expect(
      screen.getByText('오늘 당신을 기다리는 운명의 메시지.'),
    ).toBeInTheDocument()

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1_000)
    })

    expect(screen.getByTestId('location')).toHaveTextContent('/entry')
  })
})
