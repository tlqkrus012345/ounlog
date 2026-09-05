import type { SajuPreviewRequest, SajuPreviewResponse } from './types'

export async function createSajuPreview(
  request: SajuPreviewRequest,
): Promise<SajuPreviewResponse> {
  const response = await fetch('/api/v1/saju/previews', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  })

  if (!response.ok) {
    throw new Error('사주 Preview 요청에 실패했습니다.')
  }

  return response.json()
}
