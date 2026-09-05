import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { AppRoutes } from '../../routes/AppRoutes'
import { server } from '../server'

describe('사주 분석 사용자 흐름', () => {
  it('생년월일과 출생시간을 입력하고 Preview 결과를 확인한다', async () => {
    server.use(
      http.post('/v1/saju/previews', async ({ request }) => {
        expect(await request.json()).toEqual({
          birthDate: '1998-08-21',
          birthTime: '14:32',
          calendarType: 'LUNAR',
        })

        return HttpResponse.json({
          keyword: '전환',
          summary: '올해는 새로운 변화를 시도하기 좋은 흐름이 나타납니다.',
        })
      }),
    )
    const user = userEvent.setup()

    render(
      <MemoryRouter initialEntries={['/saju']}>
        <AppRoutes />
      </MemoryRouter>,
    )

    fireEvent.change(screen.getByLabelText('생년월일'), {
      target: { value: '1998-08-21' },
    })
    await user.click(screen.getByRole('button', { name: '음력' }))
    await user.click(screen.getByRole('button', { name: '다음' }))

    fireEvent.change(screen.getByLabelText('출생시간'), {
      target: { value: '14:32' },
    })
    await user.click(screen.getByRole('button', { name: '다음' }))

    expect(screen.getByText('입력한 정보가 맞나요?')).toBeInTheDocument()
    expect(screen.getByText('1998-08-21')).toBeInTheDocument()
    expect(screen.getByText('음력')).toBeInTheDocument()
    expect(screen.getByText('14:32')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '분석 시작하기' }))

    expect(await screen.findByText('전환')).toBeInTheDocument()
    expect(
      screen.getByText('올해는 새로운 변화를 시도하기 좋은 흐름이 나타납니다.'),
    ).toBeInTheDocument()
  })
})
