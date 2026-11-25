import { ApiError } from '../../shared/api/errors'
import { authApi } from './api'
import {
  authEvents,
  coordinate,
  readAuthEvent,
  type AuthEvent,
} from './coordinator'
import { clearPrivateData } from './privacy'
import type { AuthSnapshot, LoginRequest, LoginResponse } from './types'

export class AuthChangedError extends Error {}
export class LoginInProgressError extends Error {}

export function createAuthRuntime() {
  let snapshot: AuthSnapshot = {
    status: 'checking',
    accessToken: null,
    session: null,
    epoch: readAuthEvent()?.id ?? 'initial',
    privacyRevision: 0,
    loginPending: false,
    logoutState: 'idle',
  }
  const listeners = new Set<() => void>()
  let refreshPromise: Promise<LoginResponse> | null = null
  let checkPromise: Promise<void> | null = null
  let loginPromise: Promise<LoginResponse> | null = null
  let logoutPromise: Promise<void> | null = null
  let events: ReturnType<typeof authEvents> | null = null
  let refreshUncertain = false
  const update = (patch: Partial<AuthSnapshot>) => {
    snapshot = { ...snapshot, ...patch }
    listeners.forEach((listener) => listener())
  }
  const purge = () => {
    clearPrivateData()
    update({ privacyRevision: snapshot.privacyRevision + 1 })
  }
  const csrf = async () => (await authApi.csrf()).csrfToken
  const current = (epoch: string) => {
    const shared = readAuthEvent()
    if (shared && shared.id !== snapshot.epoch) applyEvent(shared)
    if (
      snapshot.epoch !== epoch ||
      (readAuthEvent()?.id ?? 'initial') !== epoch
    )
      throw new AuthChangedError()
  }
  const accept = (response: LoginResponse) => {
    if (
      snapshot.session &&
      snapshot.session.memberId !== response.session.memberId
    )
      purge()
    update({
      status: 'authenticated',
      accessToken: response.accessToken,
      session: response.session,
      logoutState: 'idle',
      signInRequired: false,
    })
  }
  const reject = (error: unknown) => {
    if (error instanceof AuthChangedError) return
    if (error instanceof ApiError && error.status === 401) {
      update({
        status:
          snapshot.session || error.code !== 'AUTHENTICATION_REQUIRED'
            ? 'reauthRequired'
            : 'guest',
        accessToken: null,
      })
    } else update({ status: 'checkError' })
  }
  function applyEvent(event: AuthEvent) {
    if (event.id === snapshot.epoch) return
    if (event.id !== readAuthEvent()?.id) return
    if (event.kind.startsWith('logout')) purge()
    if (event.kind === 'login') refreshUncertain = false
    const switched =
      event.kind === 'login' &&
      snapshot.session &&
      snapshot.session.memberId !== event.memberId
    if (switched) purge()
    update({
      signInRequired: event.kind === 'refresh-uncertain',
      epoch: event.id,
      accessToken: null,
      session:
        switched || event.kind === 'logout-success' ? null : snapshot.session,
      status:
        event.kind === 'logout-success'
          ? 'guest'
          : event.kind === 'login'
            ? 'checking'
            : 'checkError',
      logoutState:
        event.kind === 'logout-start'
          ? 'pending'
          : event.kind === 'logout-error'
            ? 'error'
            : 'idle',
    })
    if (event.kind === 'login')
      void Promise.allSettled([checkPromise, refreshPromise]).then(() => {
        if (snapshot.epoch === event.id) void restore()
      })
  }
  const connect = () => {
    if (!events) events = authEvents(applyEvent)
  }
  const refresh = (): Promise<LoginResponse> => {
    connect()
    if (refreshPromise) return refreshPromise
    const epoch = snapshot.epoch
    refreshPromise = coordinate(async () => {
      current(epoch)
      if (refreshUncertain || readAuthEvent()?.kind === 'refresh-uncertain') {
        update({ signInRequired: true, status: 'checkError' })
        throw new Error('Refresh outcome unknown; sign in again')
      }
      const token = await csrf()
      current(epoch)
      try {
        const response = await authApi.refresh(token)
        current(epoch)
        accept(response)
        return response
      } catch (error) {
        current(epoch)
        if (
          !(error instanceof ApiError) &&
          !(error instanceof AuthChangedError)
        ) {
          refreshUncertain = true
          try {
            update({ epoch: events!.publish('refresh-uncertain').id })
          } catch {
            /* Keep this tab blocked. */
          }
          update({ signInRequired: true, status: 'checkError' })
        }
        throw error
      }
    })
      .catch((error) => {
        if (snapshot.epoch === epoch) reject(error)
        throw error
      })
      .finally(() => {
        refreshPromise = null
      })
    return refreshPromise
  }
  const restore = (): Promise<void> => {
    if (checkPromise) return checkPromise
    update({ status: 'checking' })
    checkPromise = refresh()
      .then(() => undefined)
      .catch(() => undefined)
      .finally(() => {
        checkPromise = null
      })
    return checkPromise
  }
  const login = (command: LoginRequest): Promise<LoginResponse> => {
    connect()
    if (loginPromise) return Promise.reject(new LoginInProgressError())
    const epoch = snapshot.epoch
    const operation = coordinate(async () => {
      current(epoch)
      const response = await authApi.login(command, await csrf())
      current(epoch)
      const event = events!.publish('login', response.session.memberId)
      update({ epoch: event.id })
      refreshUncertain = false
      accept(response)
      await csrf().catch(() => undefined)
      current(event.id)
      return response
    }).finally(() => {
      if (loginPromise === operation) {
        loginPromise = null
        update({ loginPending: false })
      }
    })
    loginPromise = operation
    update({ loginPending: true })
    return operation
  }
  const logout = (): Promise<void> => {
    connect()
    if (logoutPromise) return logoutPromise
    purge()
    update({ accessToken: null, status: 'checking', logoutState: 'pending' })
    try {
      update({ epoch: events!.publish('logout-start').id })
    } catch {
      update({ logoutState: 'error', status: 'checkError' })
      return Promise.reject(new Error('Shared storage unavailable'))
    }
    logoutPromise = coordinate(async () => {
      await authApi.logout(await csrf())
      const event = events!.publish('logout-success')
      update({
        signInRequired: false,
        epoch: event.id,
        session: null,
        status: 'guest',
        logoutState: 'idle',
      })
      refreshUncertain = false
      await csrf().catch(() => undefined)
    })
      .catch((error) => {
        update({ status: 'checkError', logoutState: 'error' })
        try {
          update({ epoch: events!.publish('logout-error').id })
        } catch {
          /* Already blocked. */
        }
        throw error
      })
      .finally(() => {
        logoutPromise = null
      })
    return logoutPromise
  }
  const verify = async (activity = false) => {
    const before = snapshot
    if (!before.accessToken) {
      await restore()
      return
    }
    try {
      let session
      try {
        session = await authApi.session(before.accessToken, activity)
      } catch (error) {
        if (
          !(error instanceof ApiError) ||
          error.code !== 'ACCESS_TOKEN_EXPIRED'
        )
          throw error
        current(before.epoch)
        const latest = snapshot.accessToken
        const token =
          latest && latest !== before.accessToken
            ? latest
            : (await refresh()).accessToken
        current(before.epoch)
        session = await authApi.session(token, activity)
      }
      current(before.epoch)
      if (session.memberId !== before.session?.memberId)
        throw new AuthChangedError()
      update({ session, status: 'authenticated' })
    } catch (error) {
      if (snapshot.epoch === before.epoch) reject(error)
    }
  }
  return {
    getSnapshot: () => snapshot,
    subscribe: (listener: () => void) => {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    connect,
    restore,
    login,
    logout,
    refresh,
    verify,
    reject,
    current,
    purge,
    dispose: () => {
      events?.close()
      events = null
      listeners.clear()
      refreshPromise = null
      checkPromise = null
      loginPromise = null
      logoutPromise = null
      refreshUncertain = false
      snapshot = {
        status: 'checking',
        accessToken: null,
        session: null,
        epoch: readAuthEvent()?.id ?? 'initial',
        privacyRevision: 0,
        loginPending: false,
        logoutState: 'idle',
      }
    },
  }
}
export const authRuntime = createAuthRuntime()
