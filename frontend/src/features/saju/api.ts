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
    typeof value.year === 'number' &&
    Number.isInteger(value.year) &&
    typeof value.keyword === 'string' &&
    typeof value.summary === 'string'
  )
}

function isSajuAnalysisResponse(value: unknown): value is SajuAnalysisResponse {
  if (!isRecord(value)) return false

  if (value.result === null) {
    return typeof value.legacyResult === 'string' && value.asOfDate === null
  }

  const result = value.result
  return (
    isRecord(result) &&
    result.schemaVersion === '2' &&
    value.legacyResult === null &&
    typeof value.asOfDate === 'string' &&
    /^\d{4}-\d{2}-\d{2}$/.test(value.asOfDate) &&
    !Number.isNaN(Date.parse(value.asOfDate)) &&
    [
      'fiveElements',
      'annualOverview',
      'personality',
      'career',
      'wealth',
      'relationship',
      'currentLuck',
    ].every((key) => {
      const paragraph = result[key]
      return (
        isRecord(paragraph) &&
        typeof paragraph.content === 'string' &&
        paragraph.content.trim().length > 0 &&
        Array.isArray(paragraph.evidence) &&
        paragraph.evidence.every(
          (evidence: unknown) =>
            isRecord(evidence) &&
            typeof evidence.source === 'string' &&
            typeof evidence.value === 'string' &&
            typeof evidence.interpretation === 'string',
        )
      )
    })
  )
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
    timeoutMs: 60_000,
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
