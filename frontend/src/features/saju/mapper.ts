import type {
  SajuAnalysisRequest,
  SajuFormState,
  SajuPreviewRequest,
} from './types'

export function toSajuPreviewRequest(form: SajuFormState): SajuPreviewRequest {
  return {
    birthDate: form.birthDate,
    birthTime: form.birthTime,
    calendarType: form.calendarType,
    gender: form.gender,
    isLeapMonth: form.isLeapMonth,
  }
}

export function toSajuAnalysisRequest(
  form: SajuFormState,
): SajuAnalysisRequest {
  return {
    birthDate: form.birthDate,
    birthTime: form.birthTime,
    calendarType: form.calendarType,
    gender: form.gender,
    isLeapMonth: form.isLeapMonth,
  }
}
