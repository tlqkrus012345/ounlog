export const AUTH_EVENT_KEY = 'ounlog-auth-event'
export type AuthEvent = {
  id: string
  kind:
    | 'login'
    | 'logout-start'
    | 'logout-success'
    | 'logout-error'
    | 'refresh-uncertain'
  memberId?: string
}

function parseEvent(value: string | null): AuthEvent | null {
  try {
    const v = JSON.parse(value ?? 'null')
    return v &&
      typeof v.id === 'string' &&
      [
        'login',
        'logout-start',
        'logout-success',
        'logout-error',
        'refresh-uncertain',
      ].includes(v.kind)
      ? v
      : null
  } catch {
    return null
  }
}

export function readAuthEvent(): AuthEvent | null {
  try {
    return parseEvent(localStorage.getItem(AUTH_EVENT_KEY))
  } catch {
    return null
  }
}

export function coordinate<T>(work: () => Promise<T>): Promise<T> {
  if (!navigator.locks)
    return Promise.reject(new Error('Browser coordination unavailable'))
  return navigator.locks.request('ounlog-auth', work)
}

export function authEvents(onEvent: (event: AuthEvent) => void) {
  let channel: BroadcastChannel | null = null
  try {
    if (typeof BroadcastChannel !== 'undefined')
      channel = new BroadcastChannel('ounlog-auth')
  } catch {
    /* Storage events still notify other tabs. */
  }
  const receive = (message: MessageEvent) => {
    const event = parseEvent(JSON.stringify(message.data))
    if (event) onEvent(event)
  }
  const storage = (e: StorageEvent) => {
    if (e.key === AUTH_EVENT_KEY) {
      const event = parseEvent(e.newValue)
      if (event) onEvent(event)
    }
  }
  channel?.addEventListener('message', receive)
  window.addEventListener('storage', storage)
  return {
    publish(kind: AuthEvent['kind'], memberId?: string) {
      const event: AuthEvent = { id: crypto.randomUUID(), kind, memberId }
      localStorage.setItem(AUTH_EVENT_KEY, JSON.stringify(event))
      channel?.postMessage(event)
      return event
    },
    close() {
      channel?.close()
      window.removeEventListener('storage', storage)
    },
  }
}
