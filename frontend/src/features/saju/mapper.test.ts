import { describe, expect, it } from 'vitest'
import { toSajuAnalysisRequest } from './mapper'

describe('toSajuAnalysisRequest', () => {
  it('출생시간을 알면 입력한 시간을 전달한다', () => {
    const request = toSajuAnalysisRequest({
      birthDate: '1995-03-21',
      birthTime: '14:30',
      birthTimeKnown: true,
      calendarType: 'SOLAR',
    })

    expect(request).toEqual({
      birthDate: '1995-03-21',
      birthTime: '14:30',
      calendarType: 'SOLAR',
    })
  })

  it('자정은 실제 출생시간으로 전달한다', () => {
    const request = toSajuAnalysisRequest({
      birthDate: '1995-03-21',
      birthTime: '00:00',
      birthTimeKnown: true,
      calendarType: 'LUNAR',
    })

    expect(request.birthTime).toBe('00:00')
  })

  it('출생시간을 모르면 birthTime을 null로 전달한다', () => {
    const request = toSajuAnalysisRequest({
      birthDate: '1995-03-21',
      birthTime: '00:00',
      birthTimeKnown: false,
      calendarType: 'SOLAR',
    })

    expect(request).toEqual({
      birthDate: '1995-03-21',
      birthTime: null,
      calendarType: 'SOLAR',
    })
  })
})
