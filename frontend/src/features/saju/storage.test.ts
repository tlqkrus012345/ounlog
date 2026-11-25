import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { SajuFormState } from './types'
import {
  clearSajuForm,
  getSajuForm,
  readDraft,
  saveSajuDraft,
  saveSajuForm,
} from './storage'

const SAJU_FORM: SajuFormState = {
  birthDate: '1998-08-21',
  birthTime: '00:00',
  calendarType: 'SOLAR',
  gender: 'MALE',
  isLeapMonth: false,
}

describe('saju storage', () => {
  beforeEach(() => {
    sessionStorage.clear()
  })

  it('SajuFormState를 저장하고 다시 조회한다', () => {
    saveSajuForm(SAJU_FORM)

    expect(getSajuForm()).toEqual(SAJU_FORM)
  })

  it('같은 작업의 수정·단계 이동·비회원에서 로그인 전환은 작업 ID를 유지한다', () => {
    expect(saveSajuDraft({ birthDate: SAJU_FORM.birthDate }, null)).toBe(true)
    const workId = readDraft()?.workId
    expect(workId).toBeTruthy()
    saveSajuDraft({ ...SAJU_FORM, birthDate: '1995-03-21' }, null)
    expect(readDraft()?.workId).toBe(workId)
    saveSajuDraft(SAJU_FORM, '1')
    expect(readDraft()?.workId).toBe(workId)
    saveSajuDraft(SAJU_FORM, '2')
    expect(readDraft()?.workId).not.toBe(workId)
    clearSajuForm()
    saveSajuDraft(SAJU_FORM, '2')
    expect(readDraft()?.workId).not.toBe(workId)
  })

  it('기존 초안은 입력을 유지하고 다음 저장부터 작업 ID를 부여한다', () => {
    sessionStorage.setItem(
      'saju-form',
      JSON.stringify({ input: SAJU_FORM, ownerMemberId: '1' }),
    )
    expect(readDraft()?.input).toEqual(SAJU_FORM)
    expect(readDraft()?.workId).toBeUndefined()
    expect(saveSajuDraft(SAJU_FORM, '1')).toBe(true)
    expect(readDraft()?.workId).toBeTruthy()
    expect(readDraft()?.input).toEqual(SAJU_FORM)
  })

  it('저장 예외는 호출부가 감지할 수 있도록 false를 반환한다', () => {
    const spy = vi
      .spyOn(Storage.prototype, 'setItem')
      .mockImplementation(() => {
        throw new DOMException('full', 'QuotaExceededError')
      })
    try {
      expect(saveSajuDraft(SAJU_FORM)).toBe(false)
      expect(readDraft()).toBeNull()
    } finally {
      spy.mockRestore()
    }
  })

  it('저장된 데이터가 없으면 null을 반환한다', () => {
    expect(getSajuForm()).toBeNull()
  })

  it('저장 데이터를 삭제하면 null을 반환한다', () => {
    saveSajuForm(SAJU_FORM)

    clearSajuForm()

    expect(getSajuForm()).toBeNull()
  })

  it('gender가 없는 과거 저장 데이터는 null을 반환한다', () => {
    sessionStorage.setItem(
      'saju-form',
      JSON.stringify({
        birthDate: '1998-08-21',
        birthTime: '14:32',
        birthTimeKnown: true,
        calendarType: 'SOLAR',
      }),
    )

    expect(getSajuForm()).toBeNull()
  })

  it('birthTime이 null인 과거 저장 데이터는 null을 반환한다', () => {
    sessionStorage.setItem(
      'saju-form',
      JSON.stringify({
        birthDate: '1998-08-21',
        birthTime: null,
        birthTimeKnown: false,
        calendarType: 'SOLAR',
        gender: 'MALE',
        isLeapMonth: false,
      }),
    )

    expect(getSajuForm()).toBeNull()
  })

  it('isLeapMonth가 없는 과거 저장 데이터는 null을 반환한다', () => {
    sessionStorage.setItem(
      'saju-form',
      JSON.stringify({
        birthDate: '1998-08-21',
        birthTime: '14:32',
        calendarType: 'LUNAR',
        gender: 'MALE',
      }),
    )

    expect(getSajuForm()).toBeNull()
  })

  it('양력이면서 윤달인 저장 데이터는 null을 반환한다', () => {
    sessionStorage.setItem(
      'saju-form',
      JSON.stringify({
        ...SAJU_FORM,
        isLeapMonth: true,
      }),
    )

    expect(getSajuForm()).toBeNull()
  })

  it('JSON 형식이 잘못된 저장 데이터는 null을 반환한다', () => {
    sessionStorage.setItem('saju-form', '{invalid-json')

    expect(getSajuForm()).toBeNull()
  })
})
