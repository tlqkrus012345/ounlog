export type CalendarType = 'SOLAR' | 'LUNAR'
export type Gender = 'MALE' | 'FEMALE'

export type SajuPreviewRequest = {
  birthDate: string
  birthTime: string
  calendarType: CalendarType
  gender: Gender
  isLeapMonth: boolean
}

export type SajuAnalysisRequest = {
  birthDate: string
  birthTime: string
  calendarType: CalendarType
  gender: Gender
  isLeapMonth: boolean
}

export type SajuFormState = {
  birthDate: string
  birthTime: string
  calendarType: CalendarType
  gender: Gender
  isLeapMonth: boolean
}

export type SajuPreviewResponse = {
  keyword: string
  summary: string
}

export type SajuAnalysisResponse = {
  result: string
}

export type SajuAnalysisCreationResult = SajuAnalysisResponse & {
  status: 'CREATED' | 'EXISTING'
}
