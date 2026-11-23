import type { ApiErrorResponse, FieldError } from './errors'
import { ApiError, ApiTimeoutError, InvalidApiResponseError } from './errors'

const DEFAULT_TIMEOUT_MS = 10_000

export interface RequestOptions<TResponse> extends RequestInit {
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
  const response = await requestWithStatus(url, options)

  return response.data
}

export async function requestWithStatus<TResponse>(
  url: string,
  options: RequestOptions<TResponse>,
): Promise<{ data: TResponse; status: number }> {
  const {
    timeoutMs = DEFAULT_TIMEOUT_MS,
    validate,
    signal,
    ...requestInit
  } = options
  const controller = new AbortController()
  let timedOut = false
  const timeoutId = window.setTimeout(() => {
    timedOut = true
    controller.abort()
  }, timeoutMs)
  const cancel = () => controller.abort(signal?.reason)
  signal?.addEventListener('abort', cancel, { once: true })
  if (signal?.aborted) cancel()

  try {
    const response = await fetch(url, {
      ...requestInit,
      signal: controller.signal,
    })
    const responseBody =
      response.status === 204 ? undefined : await parseJson(response)

    if (!response.ok) {
      if (
        !isApiErrorResponse(responseBody) ||
        responseBody.status !== response.status
      ) {
        throw new InvalidApiResponseError()
      }
      throw new ApiError(responseBody)
    }

    if (!validate(responseBody)) {
      throw new InvalidApiResponseError()
    }

    return {
      data: responseBody,
      status: response.status,
    }
  } catch (error) {
    if (signal?.aborted)
      throw signal.reason ?? new DOMException('Request cancelled', 'AbortError')
    if (timedOut) {
      throw new ApiTimeoutError()
    }
    throw error
  } finally {
    window.clearTimeout(timeoutId)
    signal?.removeEventListener('abort', cancel)
  }
}
