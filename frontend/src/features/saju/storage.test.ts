import { beforeEach, describe, expect, it } from 'vitest'
import type { SajuFormState } from './types'
import { clearSajuForm, getSajuForm, saveSajuForm } from './storage'

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
