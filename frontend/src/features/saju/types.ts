export type CalendarType = 'SOLAR' | 'LUNAR'

export type SajuPreviewRequest = {
  birthDate: string
  birthTime: string | null
  calendarType: CalendarType
}

export type SajuAnalysisRequest = {
  birthDate: string
  birthTime: string | null
  calendarType: CalendarType
}

export type SajuFormState = {
  birthDate: string
  birthTime: string | null
  birthTimeKnown: boolean
  calendarType: CalendarType
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
