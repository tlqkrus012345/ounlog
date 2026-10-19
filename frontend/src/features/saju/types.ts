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

export type SajuAnalysisParagraph = {
  content: string
  evidence: {
    source: string
    value: string
    interpretation: string
  }[]
}

export type SajuInterpretation = {
  schemaVersion: '2'
  fiveElements: SajuAnalysisParagraph
  annualOverview: SajuAnalysisParagraph
  personality: SajuAnalysisParagraph
  career: SajuAnalysisParagraph
  wealth: SajuAnalysisParagraph
  relationship: SajuAnalysisParagraph
  currentLuck: SajuAnalysisParagraph
}

export type SajuAnalysisResponse =
  | {
      result: SajuInterpretation
      legacyResult: null
      asOfDate: string
    }
  | {
      result: null
      legacyResult: string
      asOfDate: null
    }

export type SajuAnalysisCreationResult = SajuAnalysisResponse & {
  status: 'CREATED' | 'EXISTING'
}
