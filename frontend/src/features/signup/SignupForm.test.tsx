import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { delay, http, HttpResponse } from 'msw'
import { describe, expect, it, vi } from 'vitest'
import { server } from '../../test/server'
import { SignupForm } from './SignupForm'

const VALID_EMAIL = 'test@example.com'
const VALID_PASSWORD = 'password123'

interface RenderFilledSignupFormOptions {
  email?: string
  password?: string
}

async function renderFilledSignupForm({
  email = VALID_EMAIL,
  password = VALID_PASSWORD,
}: RenderFilledSignupFormOptions = {}) {
  const user = userEvent.setup()

  render(<SignupForm />)

  const emailInput = screen.getByRole('textbox', {
    name: '이메일',
  })
  const passwordInput = screen.getByLabelText('비밀번호')
  const submitButton = screen.getByRole('button', {
    name: '가입하기',
  })

  await user.type(emailInput, email)
  await user.type(passwordInput, password)

  return {
    user,
    emailInput,
    passwordInput,
    submitButton,
  }
}

describe('SignupForm', () => {
  it('이메일과 비밀번호를 입력할 수 있다', async () => {
    const { emailInput, passwordInput } = await renderFilledSignupForm()

    expect(emailInput).toHaveValue(VALID_EMAIL)
    expect(passwordInput).toHaveValue(VALID_PASSWORD)
    expect(passwordInput).toHaveAttribute('type', 'password')
  })

  it('회원가입에 성공하면 성공 메시지를 표시하고 입력값을 비운다', async () => {
    server.use(
      http.post('/v1/members/signup', async ({ request }) => {
        const requestBody = await request.json()

        expect(requestBody).toEqual({
          email: VALID_EMAIL,
          password: VALID_PASSWORD,
        })

        return HttpResponse.json(
          {
            email: VALID_EMAIL,
          },
          {
            status: 201,
          },
        )
      }),
    )

    const { user, emailInput, passwordInput, submitButton } =
      await renderFilledSignupForm()

    await user.click(submitButton)

    expect(await screen.findByRole('status')).toHaveTextContent(
      `${VALID_EMAIL} 계정이 생성되었습니다.`,
    )

    expect(emailInput).toHaveValue('')
    expect(passwordInput).toHaveValue('')
    expect(submitButton).toBeEnabled()
  })

  it('이미 가입된 이메일이면 서버 오류 메시지를 표시한다', async () => {
    server.use(
      http.post('/v1/members/signup', () => {
        return HttpResponse.json(
          {
            status: 409,
            code: 'MEMBER_EMAIL_DUPLICATED',
            message: '이미 가입된 이메일입니다.',
            path: '/v1/members/signup',
          },
          {
            status: 409,
          },
        )
      }),
    )

    const { user, submitButton } = await renderFilledSignupForm({
      email: 'duplicate@example.com',
    })

    await user.click(submitButton)

    expect(await screen.findByRole('alert')).toHaveTextContent(
      '이미 가입된 이메일입니다.',
    )

    expect(screen.getByRole('button', { name: '가입하기' })).toBeEnabled()
  })

  it('서버가 이메일 Validation 오류를 반환하면 이메일 필드에 표시한다', async () => {
    server.use(
      http.post('/v1/members/signup', () => {
        return HttpResponse.json(
          {
            status: 400,
            code: 'INVALID_REQUEST',
            message: '요청 값이 올바르지 않습니다.',
            path: '/v1/members/signup',
            errors: [
              {
                field: 'email',
                code: 'Email',
                message: '올바른 이메일 형식이어야 합니다.',
              },
            ],
          },
          {
            status: 400,
          },
        )
      }),
    )

    const { user, emailInput, submitButton } = await renderFilledSignupForm()

    await user.click(submitButton)

    expect(
      await screen.findByText('올바른 이메일 형식이어야 합니다.'),
    ).toBeInTheDocument()

    expect(emailInput).toHaveAttribute('aria-invalid', 'true')

    expect(
      screen.queryByText('요청 값이 올바르지 않습니다.'),
    ).not.toBeInTheDocument()
  })

  it('네트워크 오류가 발생하면 일반 오류 메시지를 표시한다', async () => {
    server.use(
      http.post('/v1/members/signup', () => {
        return HttpResponse.error()
      }),
    )

    const { user, submitButton } = await renderFilledSignupForm()

    await user.click(submitButton)

    expect(await screen.findByRole('alert')).toHaveTextContent(
      '서버에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요.',
    )

    expect(screen.getByRole('button', { name: '가입하기' })).toBeEnabled()
  })

  it('요청 중에는 가입 버튼을 비활성화하고 중복 요청을 보내지 않는다', async () => {
    let requestCount = 0
    let resolveRequest: (() => void) | undefined

    server.use(
      http.post('/v1/members/signup', async () => {
        requestCount += 1

        await new Promise<void>((resolve) => {
          resolveRequest = resolve
        })

        return HttpResponse.json(
          {
            email: VALID_EMAIL,
          },
          {
            status: 201,
          },
        )
      }),
    )

    const { user, submitButton } = await renderFilledSignupForm()

    await user.click(submitButton)

    await waitFor(() => {
      expect(requestCount).toBe(1)
    })

    const submittingButton = screen.getByRole('button', {
      name: '가입 중...',
    })

    expect(submittingButton).toBeDisabled()

    await user.click(submittingButton)

    expect(requestCount).toBe(1)

    resolveRequest?.()

    expect(await screen.findByRole('status')).toHaveTextContent(
      `${VALID_EMAIL} 계정이 생성되었습니다.`,
    )
  })

  it('요청이 10초를 초과하면 timeout 메시지를 표시한다', async () => {
    server.use(
      http.post('/v1/members/signup', async () => {
        await delay('infinite')

        return HttpResponse.json(
          {
            email: VALID_EMAIL,
          },
          {
            status: 201,
          },
        )
      }),
    )

    const { submitButton } = await renderFilledSignupForm()

    vi.useFakeTimers()

    try {
      fireEvent.click(submitButton)

      expect(screen.getByRole('button', { name: '가입 중...' })).toBeDisabled()

      await act(async () => {
        await vi.advanceTimersByTimeAsync(10_000)
      })

      expect(screen.getByRole('alert')).toHaveTextContent(
        '요청 시간이 초과되었습니다. 잠시 후 다시 시도해 주세요.',
      )

      expect(screen.getByRole('button', { name: '가입하기' })).toBeEnabled()
    } finally {
      vi.useRealTimers()
    }
  })
})
