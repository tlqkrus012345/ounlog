import type { SajuFormState, SajuPreviewRequest } from './types'

export function toSajuPreviewRequest(form: SajuFormState): SajuPreviewRequest {
  return {
    birthDate: form.birthDate,

    birthTime: form.birthTimeKnown ? form.birthTime : null,

    calendarType: form.calendarType,
  }
}
