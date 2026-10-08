import { describe, expect, it } from 'vitest'
import { toSajuAnalysisRequest, toSajuPreviewRequest } from './mapper'

describe('toSajuAnalysisRequest', () => {
  it('출생시간과 성별을 전달한다', () => {
    const request = toSajuAnalysisRequest({
      birthDate: '1995-03-21',
      birthTime: '14:30',
      calendarType: 'SOLAR',
      gender: 'FEMALE',
    })

    expect(request).toEqual({
      birthDate: '1995-03-21',
      birthTime: '14:30',
      calendarType: 'SOLAR',
      gender: 'FEMALE',
    })
  })

  it('자정은 실제 출생시간으로 전달한다', () => {
    const request = toSajuAnalysisRequest({
      birthDate: '1995-03-21',
      birthTime: '00:00',
      calendarType: 'LUNAR',
      gender: 'MALE',
    })

    expect(request.birthTime).toBe('00:00')
  })
})

describe('toSajuPreviewRequest', () => {
  it('출생시간과 성별을 전달한다', () => {
    const request = toSajuPreviewRequest({
      birthDate: '1995-03-21',
      birthTime: '14:30',
      calendarType: 'SOLAR',
      gender: 'MALE',
    })

    expect(request).toEqual({
      birthDate: '1995-03-21',
      birthTime: '14:30',
      calendarType: 'SOLAR',
      gender: 'MALE',
    })
  })
})
