import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { ApiError, InvalidApiResponseError } from '../../shared/api/errors'
import { server } from '../../test/server'
import { createSajuPreview } from './api'
import type { SajuPreviewRequest } from './types'

const PREVIEW_REQUEST: SajuPreviewRequest = {
  birthDate: '1990-01-01',
  birthTime: '12:30',
  calendarType: 'SOLAR',
}

describe('createSajuPreview', () => {
  it('사주 Preview 요청을 보내고 정상 응답을 반환한다', async () => {
    server.use(
      http.post('/v1/saju/previews', async ({ request }) => {
        expect(await request.json()).toEqual(PREVIEW_REQUEST)

        return HttpResponse.json({
          keyword: '균형',
          summary: '균형을 중요하게 생각합니다.',
        })
      }),
    )

    await expect(createSajuPreview(PREVIEW_REQUEST)).resolves.toEqual({
      keyword: '균형',
      summary: '균형을 중요하게 생각합니다.',
    })
  })

  it('백엔드 오류 응답을 ApiError로 변환한다', async () => {
    server.use(
      http.post('/v1/saju/previews', () =>
        HttpResponse.json(
          {
            status: 400,
            code: 'INVALID_BIRTH_DATE',
            message: '생년월일이 올바르지 않습니다.',
            path: '/v1/saju/previews',
          },
          { status: 400 },
        ),
      ),
    )

    await expect(createSajuPreview(PREVIEW_REQUEST)).rejects.toBeInstanceOf(
      ApiError,
    )
  })

  it('성공 응답이 API 계약과 다르면 InvalidApiResponseError를 던진다', async () => {
    server.use(
      http.post('/v1/saju/previews', () =>
        HttpResponse.json({ keyword: '균형' }),
      ),
    )

    await expect(createSajuPreview(PREVIEW_REQUEST)).rejects.toBeInstanceOf(
      InvalidApiResponseError,
    )
  })
})
