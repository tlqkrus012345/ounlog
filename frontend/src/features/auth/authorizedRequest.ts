import { requestWithStatus, type RequestOptions } from '../../shared/api/client'
import { ApiError } from '../../shared/api/errors'
import { authRuntime, AuthChangedError } from './runtime'

function isAuthenticationFailure(error: unknown): error is ApiError {
  return (
    error instanceof ApiError &&
    error.status === 401 &&
    typeof error.timestamp === 'string' &&
    error.timestamp.endsWith('Z') &&
    Number.isFinite(Date.parse(error.timestamp)) &&
    [
      'AUTHENTICATION_REQUIRED',
      'ACCESS_TOKEN_EXPIRED',
      'SESSION_EXPIRED',
      'SESSION_INVALID',
    ].includes(error.code)
  )
}

export async function authorizedRequest<T>(
  url: string,
  options: RequestOptions<T> & { activity?: boolean },
) {
  const { activity = false, ...init } = options
  const before = authRuntime.getSnapshot()
  if (!before.accessToken || before.status !== 'authenticated')
    throw new Error('Authentication required')
  const sameIdentity = () => {
    authRuntime.current(before.epoch)
    if (
      authRuntime.getSnapshot().session?.memberId !== before.session?.memberId
    )
      throw new AuthChangedError()
  }
  const send = (token: string) => {
    const headers = new Headers(init.headers)
    headers.set('Authorization', `Bearer ${token}`)
    if (activity) headers.set('X-User-Activity', 'true')
    return requestWithStatus(url, {
      ...init,
      headers,
      credentials: 'same-origin',
    })
  }
  try {
    sameIdentity()
    let response
    try {
      response = await send(before.accessToken)
    } catch (error) {
      if (
        !isAuthenticationFailure(error) ||
        error.code !== 'ACCESS_TOKEN_EXPIRED'
      )
        throw error
      sameIdentity()
      const next = authRuntime.getSnapshot()
      const token =
        next.accessToken && next.accessToken !== before.accessToken
          ? next.accessToken
          : (await authRuntime.refresh()).accessToken
      sameIdentity()
      response = await send(token)
    }
    sameIdentity()
    return response
  } catch (error) {
    if (
      isAuthenticationFailure(error) &&
      authRuntime.getSnapshot().epoch === before.epoch
    )
      authRuntime.reject(error)
    throw error
  }
}
