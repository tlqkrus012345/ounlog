import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { server } from '../../test/server'
import { InvalidApiResponseError, signup, SignupApiError } from './api'
import type { SignupRequest } from './types'

const SIGNUP_REQUEST: SignupRequest = {
  email: 'test@example.com',
  password: 'password123',
}

describe('signup', () => {
  it('회원가입 요청을 보내고 정상 응답을 반환한다', async () => {
    server.use(
      http.post('/v1/members/signup', async ({ request }) => {
        expect(await request.json()).toEqual(SIGNUP_REQUEST)

        return HttpResponse.json(
          {
            email: SIGNUP_REQUEST.email,
          },
          {
            status: 201,
          },
        )
      }),
    )

    const response = await signup(SIGNUP_REQUEST)

    expect(response).toEqual({
      email: SIGNUP_REQUEST.email,
    })
  })
  it('백엔드 오류 응답을 SignupApiError로 변환한다', async () => {
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

    try {
      await signup(SIGNUP_REQUEST)
      expect.unreachable('signup()이 오류를 던져야 합니다.')
    } catch (error) {
      expect(error).toBeInstanceOf(SignupApiError)

      const apiError = error as SignupApiError

      expect(apiError.status).toBe(409)
      expect(apiError.code).toBe('MEMBER_EMAIL_DUPLICATED')
      expect(apiError.message).toBe('이미 가입된 이메일입니다.')
      expect(apiError.fieldErrors).toEqual([])
    }
  })

  it('서버가 JSON이 아닌 응답을 반환하면 InvalidApiResponseError를 던진다', async () => {
    server.use(
      http.post('/v1/members/signup', () => {
        return HttpResponse.text('<html><body>Bad Gateway</body></html>', {
          status: 502,
        })
      }),
    )

    await expect(signup(SIGNUP_REQUEST)).rejects.toBeInstanceOf(
      InvalidApiResponseError,
    )
  })

  it('성공 응답이 API 계약과 다르면 InvalidApiResponseError를 던진다', async () => {
    server.use(
      http.post('/v1/members/signup', () => {
        return HttpResponse.json(
          {
            userEmail: 'test@example.com',
          },
          {
            status: 201,
          },
        )
      }),
    )

    await expect(signup(SIGNUP_REQUEST)).rejects.toBeInstanceOf(
      InvalidApiResponseError,
    )
  })
})
