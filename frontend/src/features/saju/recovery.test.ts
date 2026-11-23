import { afterEach, describe, expect, it, vi } from 'vitest'
import { createRecovery, findRecovery, consumeRecovery } from './recovery'
import { readDraft } from './storage'

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
    expect(createRecovery('1', '/saju/confirm', form)?.createdAt).toBe(
      first.createdAt,
    )
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
