import { request, requestWithStatus } from '../../shared/api/client'
import { InvalidApiResponseError } from '../../shared/api/errors'
import type {
  SajuAnalysisCreationResult,
  SajuAnalysisRequest,
  SajuAnalysisResponse,
  SajuPreviewRequest,
  SajuPreviewResponse,
} from './types'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isSajuPreviewResponse(value: unknown): value is SajuPreviewResponse {
  return (
    isRecord(value) &&
    typeof value.keyword === 'string' &&
    typeof value.summary === 'string'
  )
}

function isSajuAnalysisResponse(value: unknown): value is SajuAnalysisResponse {
  return isRecord(value) && typeof value.result === 'string'
}

export async function createSajuPreview(
  previewRequest: SajuPreviewRequest,
): Promise<SajuPreviewResponse> {
  return request('/v1/saju/previews', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(previewRequest),
    validate: isSajuPreviewResponse,
  })
}

export async function createSajuAnalysis(
  analysisRequest: SajuAnalysisRequest,
  accessToken: string,
): Promise<SajuAnalysisCreationResult> {
  const response = await requestWithStatus('/v1/saju/analysis', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(analysisRequest),
    validate: isSajuAnalysisResponse,
  })

  if (response.status !== 200 && response.status !== 201) {
    throw new InvalidApiResponseError()
  }

  return {
    ...response.data,
    status: response.status === 200 ? 'EXISTING' : 'CREATED',
  }
}
