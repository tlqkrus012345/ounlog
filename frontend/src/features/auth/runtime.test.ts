import { waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { http, HttpResponse } from 'msw'
import { server } from '../../test/server'
import { authError, tokenResponse } from '../../test/authFixture'
import {
  authRuntime,
  AuthChangedError,
  createAuthRuntime,
  LoginInProgressError,
} from './runtime'
import { authorizedRequest } from './authorizedRequest'
import { saveSajuForm, getSajuForm } from '../saju/storage'
import { createRecovery, findRecovery } from '../saju/recovery'
import { authApi } from './api'
import { AUTH_EVENT_KEY, readAuthEvent } from './coordinator'

const command = { email: 'member@example.com', password: 'password123' }
const form = {
  birthDate: '1995-03-21',
  birthTime: '14:30',
  calendarType: 'SOLAR',
  gender: 'MALE',
  isLeapMonth: false,
} as const
async function signedIn() {
  server.use(
    http.post('/v1/auth/refresh', () => HttpResponse.json(tokenResponse())),
  )
  await authRuntime.restore()
}
function deferred() {
  let resolve!: () => void
  const promise = new Promise<void>((r) => {
    resolve = r
  })
  return { promise, resolve }
}

describe('authentication runtime and request boundaries', () => {
  it('같은 탭의 동시 재발급을 하나로 합치고 CSRF만 보낸다', async () => {
    let calls = 0
    server.use(
      http.post('/v1/auth/refresh', ({ request }) => {
        calls++
        expect(request.headers.get('X-CSRF-TOKEN')).toBe('csrf-token')
        expect(request.headers.has('Authorization')).toBe(false)
        return HttpResponse.json(tokenResponse())
      }),
    )
    await Promise.all([
      authRuntime.refresh(),
      authRuntime.refresh(),
      authRuntime.refresh(),
    ])
    expect(calls).toBe(1)
    expect(authRuntime.getSnapshot().session?.memberId).toBe('1')
  })
  it('동시에 만료된 업무 요청은 재발급을 공유하고 각각 한 번만 재시도한다', async () => {
    await signedIn()
    let refreshes = 0
    let old = 0
    let next = 0
    server.use(
      http.post('/v1/auth/refresh', () => {
        refreshes++
        return HttpResponse.json(tokenResponse('1', 'new-token'))
      }),
      http.post('/business', ({ request }) => {
        expect(request.headers.get('X-User-Activity')).toBe('true')
        if (request.headers.get('Authorization') === 'Bearer access-token') {
          old++
          return authError('ACCESS_TOKEN_EXPIRED')
        }
        next++
        return HttpResponse.json({ ok: true })
      }),
    )
    const call = () =>
      authorizedRequest('/business', {
        method: 'POST',
        activity: true,
        validate: (v): v is { ok: boolean } =>
          !!v && typeof v === 'object' && 'ok' in v,
      })
    await Promise.all([call(), call()])
    expect({ refreshes, old, next }).toEqual({ refreshes: 1, old: 2, next: 2 })
  })
  it('재시도도 만료되면 더 이상 재발급하거나 업무를 반복하지 않는다', async () => {
    await signedIn()
    let refreshes = 0
    let requests = 0
    server.use(
      http.post('/v1/auth/refresh', () => {
        refreshes++
        return HttpResponse.json(tokenResponse('1', 'new'))
      }),
      http.post('/business', () => {
        requests++
        return authError('ACCESS_TOKEN_EXPIRED')
      }),
    )
    await expect(
      authorizedRequest('/business', {
        method: 'POST',
        validate: (v): v is object => !!v,
      }),
    ).rejects.toThrow()
    expect({ refreshes, requests }).toEqual({ refreshes: 1, requests: 2 })
  })
  it('연결 실패나 세션 만료에는 분석을 자동 재실행하지 않는다', async () => {
    await signedIn()
    let calls = 0
    server.use(
      http.post('/business', () => {
        calls++
        return HttpResponse.error()
      }),
    )
    await expect(
      authorizedRequest('/business', {
        method: 'POST',
        validate: (v): v is object => !!v,
      }),
    ).rejects.toThrow()
    expect(calls).toBe(1)
    expect(authRuntime.getSnapshot().status).toBe('authenticated')
    server.use(
      http.post('/business', () => {
        calls++
        return authError('SESSION_EXPIRED')
      }),
    )
    await expect(
      authorizedRequest('/business', {
        method: 'POST',
        validate: (v): v is object => !!v,
      }),
    ).rejects.toThrow()
    expect(calls).toBe(2)
    expect(authRuntime.getSnapshot().status).toBe('reauthRequired')
  })
  it('Refresh 응답을 잃으면 다른 탭과 재접속에서도 같은 토큰을 자동 재사용하지 않는다', async () => {
    let calls = 0
    server.use(
      http.post('/v1/auth/refresh', () => {
        calls++
        return HttpResponse.error()
      }),
    )
    await authRuntime.restore()
    const other = createAuthRuntime()
    try {
      await other.restore()
      expect(calls).toBe(1)
      expect(other.getSnapshot()).toMatchObject({
        status: 'checkError',
        signInRequired: true,
      })
    } finally {
      other.dispose()
    }
  })
  it('로그아웃을 선택하면 임시 입력을 즉시 지우고 서버 실패를 성공으로 표시하지 않는다', async () => {
    await signedIn()
    saveSajuForm(form)
    createRecovery('1', '/saju/confirm', form)
    const release = deferred()
    server.use(
      http.post('/v1/auth/logout', async () => {
        await release.promise
        return authError('INTERNAL_SERVER_ERROR', 500)
      }),
    )
    const result = authRuntime.logout().catch((error) => error)
    expect(getSajuForm()).toBeNull()
    expect(findRecovery()).toBeNull()
    expect(authRuntime.getSnapshot().logoutState).toBe('pending')
    release.resolve()
    await result
    expect(authRuntime.getSnapshot()).toMatchObject({
      status: 'checkError',
      logoutState: 'error',
    })
    expect(getSajuForm()).toBeNull()
  })
  it('로그아웃의 204 빈 본문과 CSRF 헤더를 처리한다', async () => {
    server.use(
      http.post('/v1/auth/logout', ({ request }) => {
        expect(request.headers.get('X-CSRF-TOKEN')).toBe('csrf-token')
        expect(request.headers.has('Authorization')).toBe(false)
        return new HttpResponse(null, { status: 204 })
      }),
    )
    await authRuntime.logout()
    expect(authRuntime.getSnapshot()).toMatchObject({
      status: 'guest',
      accessToken: null,
      session: null,
    })
  })
  it('로그아웃 후 늦게 도착한 업무 결과를 폐기한다', async () => {
    await signedIn()
    const release = deferred()
    const started = deferred()
    server.use(
      http.get('/business', async () => {
        started.resolve()
        await release.promise
        return HttpResponse.json({ private: 'old' })
      }),
      http.post(
        '/v1/auth/logout',
        () => new HttpResponse(null, { status: 204 }),
      ),
    )
    const response = authorizedRequest('/business', {
      validate: (v): v is object => !!v,
    }).catch((e) => e)
    await started.promise
    await authRuntime.logout()
    release.resolve()
    expect(await response).toBeInstanceOf(AuthChangedError)
  })
  it('진행 중 로그인 뒤에 로그아웃이 선택되면 늦은 로그인으로 상태를 되살리지 않는다', async () => {
    const release = deferred()
    const started = deferred()
    server.use(
      http.post('/v1/auth/login', async () => {
        started.resolve()
        await release.promise
        return HttpResponse.json(tokenResponse())
      }),
      http.post(
        '/v1/auth/logout',
        () => new HttpResponse(null, { status: 204 }),
      ),
    )
    const login = authRuntime.login(command).catch((e) => e)
    await started.promise
    const logout = authRuntime.logout()
    release.resolve()
    expect(await login).toBeInstanceOf(AuthChangedError)
    await logout
    expect(authRuntime.getSnapshot().status).toBe('guest')
  })
  it('잘못된 인증 성공 응답이나 timestamp 없는 오류를 신뢰하지 않는다', async () => {
    server.use(
      http.post('/v1/auth/login', () =>
        HttpResponse.json({ accessToken: 'token', tokenType: 'Bearer' }),
      ),
    )
    await expect(authApi.login(command, 'csrf')).rejects.toThrow(
      '서버 응답 형식',
    )
    server.use(
      http.post('/v1/auth/login', () =>
        HttpResponse.json(
          {
            status: 401,
            code: 'INVALID_CREDENTIALS',
            message: 'bad',
            path: '/v1/auth/login',
          },
          { status: 401 },
        ),
      ),
    )
    await expect(authApi.login(command, 'csrf')).rejects.toThrow(
      '서버 응답 형식',
    )
  })
  it('활동 확인을 요청한 경우에만 true를 전송한다', async () => {
    await signedIn()
    const activity: (string | null)[] = []
    server.use(
      http.get('/v1/auth/session', ({ request }) => {
        activity.push(request.headers.get('X-User-Activity'))
        return HttpResponse.json(tokenResponse().session)
      }),
    )
    await authRuntime.verify()
    await authRuntime.verify(true)
    expect(activity).toEqual([null, 'true'])
  })
  it('필요한 브라우저 잠금이 없으면 안전하지 않은 재발급을 시도하지 않는다', async () => {
    const locks = navigator.locks
    Object.defineProperty(navigator, 'locks', {
      configurable: true,
      value: undefined,
    })
    const spy = vi.spyOn(authApi, 'refresh')
    try {
      await authRuntime.restore()
      expect(spy).not.toHaveBeenCalled()
      expect(authRuntime.getSnapshot().status).toBe('checkError')
    } finally {
      Object.defineProperty(navigator, 'locks', {
        configurable: true,
        value: locks,
      })
      spy.mockRestore()
    }
  })
})

it('계정 전환 알림 처리 전에도 변경된 인증 문맥으로 이전 업무를 보내지 않는다', async () => {
  const { authEvents } = await import('./coordinator')
  const { waitFor } = await import('@testing-library/react')
  await signedIn()
  let calls = 0
  server.use(
    http.post('/v1/auth/refresh', () => HttpResponse.json(tokenResponse('2'))),
    http.post('/business', () => {
      calls++
      return HttpResponse.json({})
    }),
  )
  const publisher = authEvents(() => undefined)
  try {
    publisher.publish('login', '2')
    await expect(
      authorizedRequest('/business', {
        method: 'POST',
        validate: (v): v is object => !!v,
      }),
    ).rejects.toBeInstanceOf(AuthChangedError)
    expect(calls).toBe(0)
    await waitFor(() =>
      expect(authRuntime.getSnapshot().session?.memberId).toBe('2'),
    )
  } finally {
    publisher.close()
  }
})

it('계약과 맞지 않는 만료 오류만으로 업무를 재실행하거나 로그아웃하지 않는다', async () => {
  await signedIn()
  let calls = 0
  const refresh = vi.spyOn(authApi, 'refresh')
  server.use(
    http.post('/business', () => {
      calls++
      return HttpResponse.json(
        {
          status: 401,
          code: 'ACCESS_TOKEN_EXPIRED',
          message: 'incomplete error',
          path: '/business',
        },
        { status: 401 },
      )
    }),
  )
  try {
    await expect(
      authorizedRequest('/business', {
        method: 'POST',
        validate: (v): v is object => !!v,
      }),
    ).rejects.toThrow()
    expect(calls).toBe(1)
    expect(refresh).not.toHaveBeenCalled()
    expect(authRuntime.getSnapshot().status).toBe('authenticated')
  } finally {
    refresh.mockRestore()
  }
})

it.each(['1', '2'])(
  '응답 유실 후 다른 탭이 회원 %s로 로그인하면 새 문맥으로 자동 복원한다',
  async (memberId) => {
    let freshLogin = false
    let oldRefreshes = 0
    let newRefreshes = 0
    server.use(
      http.post('/v1/auth/login', () => {
        freshLogin = true
        return HttpResponse.json(tokenResponse(memberId, 'new-login'))
      }),
      http.post('/v1/auth/refresh', () => {
        if (!freshLogin) {
          oldRefreshes++
          return HttpResponse.error()
        }
        newRefreshes++
        return HttpResponse.json(tokenResponse(memberId, 'restored-new-login'))
      }),
    )
    await authRuntime.restore()
    await authRuntime.verify()
    expect(oldRefreshes).toBe(1)
    const other = createAuthRuntime()
    try {
      await other.login(command)
      const event = readAuthEvent()
      const duplicate = () =>
        window.dispatchEvent(
          new StorageEvent('storage', {
            key: AUTH_EVENT_KEY,
            newValue: JSON.stringify(event),
          }),
        )
      duplicate()
      await waitFor(() =>
        expect(authRuntime.getSnapshot()).toMatchObject({
          status: 'authenticated',
          signInRequired: false,
          accessToken: 'restored-new-login',
          session: { memberId },
        }),
      )
      duplicate()
      await authRuntime.verify()
      expect({ oldRefreshes, newRefreshes }).toEqual({
        oldRefreshes: 1,
        newRefreshes: 1,
      })
    } finally {
      other.dispose()
    }
  },
)

it.each(['success', 'failure'])(
  '새 로그인 이벤트 뒤 이전 Refresh의 늦은 %s 응답은 새 인증 문맥을 덮지 않는다',
  async (outcome) => {
    const release = deferred()
    const started = deferred()
    let calls = 0
    server.use(
      http.post('/v1/auth/refresh', async () => {
        calls++
        if (calls === 1) {
          started.resolve()
          await release.promise
          return outcome === 'success'
            ? HttpResponse.json(tokenResponse('1', 'stale-token'))
            : HttpResponse.error()
        }
        return HttpResponse.json(tokenResponse('2', 'fresh-token'))
      }),
    )
    const old = authRuntime.refresh().catch((error) => error)
    await started.promise
    const { authEvents } = await import('./coordinator')
    const publisher = authEvents(() => undefined)
    try {
      const event = publisher.publish('login', '2')
      await waitFor(() =>
        expect(authRuntime.getSnapshot().epoch).toBe(event.id),
      )
      release.resolve()
      expect(await old).toBeInstanceOf(AuthChangedError)
      await waitFor(() =>
        expect(authRuntime.getSnapshot()).toMatchObject({
          status: 'authenticated',
          epoch: event.id,
          signInRequired: false,
          accessToken: 'fresh-token',
          session: { memberId: '2' },
        }),
      )
      expect(calls).toBe(2)
      expect(readAuthEvent()?.id).toBe(event.id)
    } finally {
      release.resolve()
      publisher.close()
    }
  },
)

it.each(['success', 'failure'])(
  '진행 중 로그인은 별도 제출에 기존 %s 결과를 공유하지 않는다',
  async (outcome) => {
    const release = deferred()
    const started = deferred()
    const submitted: string[] = []
    server.use(
      http.post('/v1/auth/login', async ({ request }) => {
        const body = (await request.json()) as { email: string }
        submitted.push(body.email)
        if (submitted.length === 1) {
          started.resolve()
          await release.promise
          return outcome === 'success'
            ? HttpResponse.json(tokenResponse('1'))
            : authError('INVALID_CREDENTIALS')
        }
        return HttpResponse.json(tokenResponse('2'))
      }),
    )
    const first = authRuntime.login(command).catch((error) => error)
    await started.promise
    const second = authRuntime
      .login({ ...command, email: 'other@example.com' })
      .catch((error) => error)
    try {
      expect(authRuntime.getSnapshot()).toMatchObject({ loginPending: true })
      expect(await second).toBeInstanceOf(LoginInProgressError)
      expect(submitted).toEqual(['member@example.com'])
      release.resolve()
      await first
      expect(submitted).toEqual(['member@example.com'])
      expect(authRuntime.getSnapshot()).toMatchObject({ loginPending: false })
      if (outcome === 'failure') {
        expect(
          (await authRuntime.login({ ...command, email: 'other@example.com' }))
            .session.memberId,
        ).toBe('2')
        expect(submitted).toEqual(['member@example.com', 'other@example.com'])
      }
    } finally {
      release.resolve()
      await first
      await second
    }
  },
)

it.each(['logout-start', 'logout-success', 'logout-error'])(
  '새 로그인 뒤 늦은 %s 이벤트는 현재 개인정보와 인증 상태에 영향을 주지 않는다',
  async (kind) => {
    server.use(
      http.post('/v1/auth/login', () => HttpResponse.json(tokenResponse('2'))),
    )
    await authRuntime.login(command)
    saveSajuForm(form)
    createRecovery('2', '/saju/confirm', form)
    const before = authRuntime.getSnapshot()
    const draft = sessionStorage.getItem('saju-form')
    const records = Object.keys(localStorage)
      .filter((key) => key.startsWith('ounlog-recovery:'))
      .map((key) => [key, localStorage.getItem(key)])
    window.dispatchEvent(
      new StorageEvent('storage', {
        key: AUTH_EVENT_KEY,
        newValue: JSON.stringify({ id: 'old-logout', kind }),
      }),
    )
    expect(authRuntime.getSnapshot()).toEqual(before)
    expect(sessionStorage.getItem('saju-form')).toBe(draft)
    for (const [key, value] of records)
      expect(localStorage.getItem(key!)).toBe(value)
  },
)

it.each(['logout-start', 'logout-success', 'logout-error'] as const)(
  '최신 %s 이벤트는 즉시 개인정보를 제거하고 중복 전달은 다시 적용하지 않는다',
  async (kind) => {
    await signedIn()
    saveSajuForm(form)
    createRecovery('1', '/saju/confirm', form)
    const { authEvents } = await import('./coordinator')
    const publisher = authEvents(() => undefined)
    try {
      const event = publisher.publish(kind)
      await waitFor(() =>
        expect(authRuntime.getSnapshot().epoch).toBe(event.id),
      )
      expect(getSajuForm()).toBeNull()
      expect(findRecovery()).toBeNull()
      const revision = authRuntime.getSnapshot().privacyRevision
      window.dispatchEvent(
        new StorageEvent('storage', {
          key: AUTH_EVENT_KEY,
          newValue: JSON.stringify(event),
        }),
      )
      expect(authRuntime.getSnapshot().privacyRevision).toBe(revision)
    } finally {
      publisher.close()
    }
  },
)

it('로그인 성공 후 CSRF 준비 중 로그아웃하면 이전 제출에 성공 결과를 돌려주지 않는다', async () => {
  const release = deferred()
  const started = deferred()
  let calls = 0
  server.use(
    http.get('/v1/auth/csrf', async () => {
      if (++calls === 2) {
        started.resolve()
        await release.promise
      }
      return HttpResponse.json({ csrfToken: 'csrf-token' })
    }),
    http.post('/v1/auth/login', () => HttpResponse.json(tokenResponse())),
    http.post('/v1/auth/logout', () => new HttpResponse(null, { status: 204 })),
  )
  const result = authRuntime.login(command).catch((error) => error)
  try {
    await started.promise
    const logout = authRuntime.logout()
    release.resolve()
    expect(await result).toBeInstanceOf(AuthChangedError)
    await logout
    expect(authRuntime.getSnapshot()).toMatchObject({
      status: 'guest',
      loginPending: false,
    })
  } finally {
    release.resolve()
    await result
  }
})
