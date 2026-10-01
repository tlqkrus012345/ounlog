import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { ApiError, InvalidApiResponseError } from '../../shared/api/errors'
import { server } from '../../test/server'
import { createSajuAnalysis, createSajuPreview } from './api'
import type { SajuAnalysisRequest, SajuPreviewRequest } from './types'

const PREVIEW_REQUEST: SajuPreviewRequest = {
  birthDate: '1990-01-01',
  birthTime: '12:30',
  calendarType: 'SOLAR',
}

const ANALYSIS_REQUEST: SajuAnalysisRequest = {
  birthDate: '1995-03-21',
  birthTime: '14:30',
  calendarType: 'SOLAR',
}

const ACCESS_TOKEN = 'access-token'

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

describe('createSajuAnalysis', () => {
  it('Access Token과 사주 정보를 전달하고 정상 응답을 반환한다', async () => {
    server.use(
      http.post('/v1/saju/analysis', async ({ request }) => {
        expect(request.headers.get('Authorization')).toBe(
          `Bearer ${ACCESS_TOKEN}`,
        )
        expect(await request.json()).toEqual(ANALYSIS_REQUEST)

        return HttpResponse.json(
          {
            result: '전체 사주 분석 결과입니다.',
          },
          { status: 201 },
        )
      }),
    )

    await expect(
      createSajuAnalysis(ANALYSIS_REQUEST, ACCESS_TOKEN),
    ).resolves.toEqual({
      result: '전체 사주 분석 결과입니다.',
      status: 'CREATED',
    })
  })

  it('기존 분석 결과를 반환하면 EXISTING 상태로 변환한다', async () => {
    server.use(
      http.post('/v1/saju/analysis', () =>
        HttpResponse.json(
          {
            result: '기존 전체 사주 분석 결과입니다.',
          },
          { status: 200 },
        ),
      ),
    )

    await expect(
      createSajuAnalysis(ANALYSIS_REQUEST, ACCESS_TOKEN),
    ).resolves.toEqual({
      result: '기존 전체 사주 분석 결과입니다.',
      status: 'EXISTING',
    })
  })

  it('예상하지 않은 성공 상태 코드면 InvalidApiResponseError를 던진다', async () => {
    server.use(
      http.post('/v1/saju/analysis', () =>
        HttpResponse.json(
          {
            result: '전체 사주 분석 결과입니다.',
          },
          { status: 202 },
        ),
      ),
    )

    await expect(
      createSajuAnalysis(ANALYSIS_REQUEST, ACCESS_TOKEN),
    ).rejects.toBeInstanceOf(InvalidApiResponseError)
  })

  it('백엔드 오류 응답을 ApiError로 변환한다', async () => {
    server.use(
      http.post('/v1/saju/analysis', () =>
        HttpResponse.json(
          {
            status: 401,
            code: 'UNAUTHORIZED',
            message: '인증이 필요합니다.',
            path: '/v1/saju/analysis',
          },
          { status: 401 },
        ),
      ),
    )

    await expect(
      createSajuAnalysis(ANALYSIS_REQUEST, ACCESS_TOKEN),
    ).rejects.toBeInstanceOf(ApiError)
  })

  it('성공 응답이 API 계약과 다르면 InvalidApiResponseError를 던진다', async () => {
    server.use(
      http.post('/v1/saju/analysis', () =>
        HttpResponse.json({ analysisId: 1 }),
      ),
    )

    await expect(
      createSajuAnalysis(ANALYSIS_REQUEST, ACCESS_TOKEN),
    ).rejects.toBeInstanceOf(InvalidApiResponseError)
  })
})
