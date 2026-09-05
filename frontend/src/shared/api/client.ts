import type { ApiErrorResponse, FieldError } from './errors'
import { ApiError, ApiTimeoutError, InvalidApiResponseError } from './errors'

const DEFAULT_TIMEOUT_MS = 10_000

interface RequestOptions<TResponse> extends Omit<RequestInit, 'signal'> {
  timeoutMs?: number
  validate: (value: unknown) => value is TResponse
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isFieldError(value: unknown): value is FieldError {
  return (
    isRecord(value) &&
    typeof value.field === 'string' &&
    typeof value.code === 'string' &&
    typeof value.message === 'string'
  )
}

function isApiErrorResponse(value: unknown): value is ApiErrorResponse {
  return (
    isRecord(value) &&
    typeof value.status === 'number' &&
    typeof value.code === 'string' &&
    typeof value.message === 'string' &&
    typeof value.path === 'string' &&
    (value.errors === undefined ||
      (Array.isArray(value.errors) && value.errors.every(isFieldError)))
  )
}

async function parseJson(response: Response): Promise<unknown> {
  try {
    return await response.json()
  } catch {
    throw new InvalidApiResponseError()
  }
}

export async function request<TResponse>(
  url: string,
  options: RequestOptions<TResponse>,
): Promise<TResponse> {
  const { timeoutMs = DEFAULT_TIMEOUT_MS, validate, ...requestInit } = options
  const controller = new AbortController()
  const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetch(url, {
      ...requestInit,
      signal: controller.signal,
    })
    const responseBody = await parseJson(response)

    if (!response.ok) {
      if (!isApiErrorResponse(responseBody)) {
        throw new InvalidApiResponseError()
      }
      throw new ApiError(responseBody)
    }

    if (!validate(responseBody)) {
      throw new InvalidApiResponseError()
    }

    return responseBody
  } catch (error) {
    if (controller.signal.aborted) {
      throw new ApiTimeoutError()
    }
    throw error
  } finally {
    window.clearTimeout(timeoutId)
  }
}
