import { afterEach, describe, expect, it, vi } from 'vitest'
import { createRecovery, findRecovery, consumeRecovery } from './recovery'
import { readDraft, saveSajuDraft } from './storage'

const form = {
  birthDate: '1995-03-21',
  birthTime: '14:30',
  calendarType: 'SOLAR',
  gender: 'MALE',
  isLeapMonth: false,
} as const
afterEach(() => vi.useRealTimers())
describe('account-bound recovery', () => {
  it('24시간 정각부터 만료하고 재조회·실패로 기한을 늘리지 않는다', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-11-23T00:00:00Z'))
    const first = createRecovery('1', '/saju/confirm', form)!
    vi.setSystemTime(first.createdAt + 24 * 3600_000 - 1)
    expect(
      createRecovery('1', '/saju/confirm', form, first.workId)?.createdAt,
    ).toBe(first.createdAt)
    expect(findRecovery()).not.toBeNull()
    vi.setSystemTime(first.createdAt + 24 * 3600_000)
    expect(findRecovery()).toBeNull()
    expect(
      Object.keys(localStorage).filter((k) => k.startsWith('ounlog-recovery:')),
    ).toHaveLength(0)
  })
  it('브라우저 재접속 후보가 하나면 복원하고 사용 후 일회용 기록을 지운다', () => {
    createRecovery('1', '/saju/confirm', form)
    sessionStorage.clear()
    expect(consumeRecovery('1')?.targetPath).toBe('/saju/confirm')
    expect(readDraft()?.input).toEqual(form)
    expect(findRecovery()).toBeNull()
  })
  it('다른 회원은 입력을 받지 않고 이전 자료를 제거한다', () => {
    createRecovery('1', '/saju/confirm', form)
    expect(consumeRecovery('2')).toBeNull()
    expect(findRecovery()).toBeNull()
    expect(readDraft()).toBeNull()
  })
  it('여러 탭의 모호한 후보를 최신순으로 선택하지 않는다', () => {
    createRecovery('1', '/saju/confirm', form)
    sessionStorage.clear()
    createRecovery('1', '/saju/confirm', { ...form, birthTime: '01:00' })
    sessionStorage.clear()
    expect(findRecovery('/saju/confirm')).toBeNull()
  })
  it('민감정보를 복사하지 않고 외부 목적지·변조 기록을 거부한다', () => {
    expect(createRecovery('1', 'https://evil.example', form)).toBeNull()
    createRecovery('1', '/saju/confirm', {
      ...form,
      password: 'secret',
      accessToken: 'secret',
    } as typeof form)
    const stored = localStorage.getItem(
      Object.keys(localStorage).find((k) => k.startsWith('ounlog-recovery:'))!,
    )!
    expect(stored).not.toContain('secret')
    const parsed = JSON.parse(stored)
    parsed.targetPath = '//evil.example'
    localStorage.setItem('ounlog-recovery:' + parsed.id, JSON.stringify(parsed))
    expect(findRecovery()).toBeNull()
  })
  it('저장소를 쓸 수 없는 환경은 복구 성공으로 처리하지 않는다', () => {
    const spy = vi
      .spyOn(Storage.prototype, 'setItem')
      .mockImplementation(() => {
        throw new DOMException('blocked', 'SecurityError')
      })
    try {
      expect(createRecovery('1', '/saju', form)).toBeNull()
    } finally {
      spy.mockRestore()
    }
  })
  it('소비 중 초안 저장이 실패하면 원본과 기한을 보존하고 실패를 반환한다', () => {
    const record = createRecovery('1', '/saju/confirm', form)!
    const original = localStorage.getItem('ounlog-recovery:' + record.id)
    const setItem = Storage.prototype.setItem
    const spy = vi
      .spyOn(Storage.prototype, 'setItem')
      .mockImplementation(function (this: Storage, key, value) {
        if (this === sessionStorage && key === 'saju-form')
          throw new DOMException('full', 'QuotaExceededError')
        setItem.call(this, key, value)
      })
    try {
      expect(consumeRecovery('1', record.id)).toBeNull()
      expect(readDraft()).toBeNull()
      expect(localStorage.getItem('ounlog-recovery:' + record.id)).toBe(
        original,
      )
      expect(sessionStorage.getItem('ounlog-recovery-current')).toBe(record.id)
    } finally {
      spy.mockRestore()
    }
    expect(consumeRecovery('1', record.id)?.createdAt).toBe(record.createdAt)
    expect(readDraft()?.input).toEqual(form)
  })
  it.each(['pointer', 'record'])(
    '소비 중 %s 삭제 실패는 성공으로 처리하지 않는다',
    (failure) => {
      const record = createRecovery('1', '/saju/confirm', form)!
      const removeItem = Storage.prototype.removeItem
      const spy = vi
        .spyOn(Storage.prototype, 'removeItem')
        .mockImplementation(function (this: Storage, key) {
          if (
            (failure === 'pointer' && key === 'ounlog-recovery-current') ||
            (failure === 'record' && key === 'ounlog-recovery:' + record.id)
          )
            throw new DOMException('blocked', 'SecurityError')
          removeItem.call(this, key)
        })
      try {
        expect(consumeRecovery('1', record.id)).toBeNull()
        expect(readDraft()).toBeNull()
        expect(
          localStorage.getItem('ounlog-recovery:' + record.id),
        ).not.toBeNull()
      } finally {
        spy.mockRestore()
      }
    },
  )
  it('다른 작업의 포인터를 현재 초안의 복구 기록으로 재사용하지 않는다', () => {
    const other = createRecovery('1', '/saju/confirm', {
      ...form,
      birthDate: '2000-01-01',
    })!
    saveSajuDraft(form, '1')
    const current = createRecovery(
      '1',
      '/saju/confirm',
      form,
      readDraft()?.workId,
    )!
    expect(current.id).not.toBe(other.id)
    expect(current.input).toEqual(form)
    sessionStorage.setItem('ounlog-recovery-current', other.id)
    expect(
      createRecovery('1', '/saju/confirm', form, readDraft()?.workId)?.id,
    ).toBe(current.id)
    expect(localStorage.getItem('ounlog-recovery:' + other.id)).not.toBeNull()
  })
  it('같은 미소비 작업의 내용·경로 변경과 재시도는 최초 기한을 늘리지 않는다', () => {
    vi.useFakeTimers()
    const first = createRecovery('1', '/saju/confirm', form)!
    vi.setSystemTime(first.createdAt + 3600_000)
    const next = createRecovery(
      '1',
      '/saju/birth-time',
      { ...form, birthDate: '2000-01-01' },
      first.workId,
    )!
    expect(next).toMatchObject({
      id: first.id,
      workId: first.workId,
      createdAt: first.createdAt,
    })
    expect(next.targetPath).toBe('/saju/birth-time')
    expect(next.input.birthDate).toBe('2000-01-01')
  })
  it('현재 작업은 다른 작업의 만료·손상 기록과 분리한다', () => {
    const other = createRecovery('1', '/saju/confirm', form)!
    localStorage.setItem(
      'ounlog-recovery:' + other.id,
      JSON.stringify({ ...other, createdAt: Date.now() - 24 * 3600_000 }),
    )
    const current = createRecovery('1', '/saju/confirm', {
      ...form,
      birthDate: '2000-01-01',
    })!
    expect(current.input.birthDate).toBe('2000-01-01')
    expect(localStorage.getItem('ounlog-recovery:' + other.id)).toBeNull()
  })
  it('작업 ID 없는 기존 기록도 단일 후보로 복구하고 초안에 식별자를 부여한다', () => {
    const record = createRecovery('1', '/saju/confirm', form)!
    const legacy: Partial<typeof record> = { ...record }
    delete legacy.workId
    localStorage.setItem('ounlog-recovery:' + record.id, JSON.stringify(legacy))
    sessionStorage.clear()
    expect(consumeRecovery('1')?.id).toBe(record.id)
    expect(readDraft()?.workId).toBe(record.id)
    expect(readDraft()?.input).toEqual(form)
  })
  it('선택한 기록을 소비해도 다른 작업의 기록과 포인터는 유지한다', () => {
    const selected = createRecovery('1', '/saju/confirm', form)!
    const other = createRecovery('1', '/saju/confirm', {
      ...form,
      birthDate: '2000-01-01',
    })!
    expect(consumeRecovery('1', selected.id)?.id).toBe(selected.id)
    expect(sessionStorage.getItem('ounlog-recovery-current')).toBe(other.id)
    expect(localStorage.getItem('ounlog-recovery:' + selected.id)).toBeNull()
    expect(localStorage.getItem('ounlog-recovery:' + other.id)).not.toBeNull()
  })
})

it('이전 단계에 필수 입력이 없으면 빈 확인 화면으로 복구하지 않는다', () => {
  createRecovery('1', '/saju/confirm', { birthDate: '1995-03-21' })
  expect(consumeRecovery('1')).toBeNull()
  expect(findRecovery()).toBeNull()
})

it('형식만 맞는 잘못된 날짜와 시간을 복구 입력으로 사용하지 않는다', () => {
  const record = createRecovery('1', '/saju/confirm', form)!
  localStorage.setItem(
    'ounlog-recovery:' + record.id,
    JSON.stringify({ ...record, input: { ...form, birthDate: '2026-02-30' } }),
  )
  expect(findRecovery()).toBeNull()
  const second = createRecovery('1', '/saju/confirm', form)!
  localStorage.setItem(
    'ounlog-recovery:' + second.id,
    JSON.stringify({ ...second, input: { ...form, birthTime: '99:99' } }),
  )
  expect(findRecovery()).toBeNull()
})
