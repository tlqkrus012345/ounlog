import { request } from '../../shared/api/client'
import type { SajuPreviewRequest, SajuPreviewResponse } from './types'

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
