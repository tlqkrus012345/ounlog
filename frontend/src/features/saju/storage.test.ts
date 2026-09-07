import { beforeEach, describe, expect, it } from 'vitest'
import type { SajuFormState } from './types'
import { clearSajuForm, getSajuForm, saveSajuForm } from './storage'

const SAJU_FORM: SajuFormState = {
  birthDate: '1998-08-21',
  birthTime: '00:00',
  birthTimeKnown: true,
  calendarType: 'SOLAR',
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
})
