import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import EntryPage from './EntryPage'

function Destination() {
  return <output data-testid="location">{useLocation().pathname}</output>
}

describe('EntryPage', () => {
  it.each([
    ['사주', '/saju'],
    ['타로', '/tarot'],
    ['로그인하기', '/login'],
  ])('%s 버튼으로 %s 경로에 이동한다', async (buttonName, path) => {
    const user = userEvent.setup()
    render(
      <MemoryRouter initialEntries={['/entry']}>
        <Routes>
          <Route path="/entry" element={<EntryPage />} />
          <Route path="*" element={<Destination />} />
        </Routes>
      </MemoryRouter>,
    )

    await user.click(
      screen.getByRole('button', { name: new RegExp(`^${buttonName}`) }),
    )

    expect(screen.getByTestId('location')).toHaveTextContent(path)
  })
})
