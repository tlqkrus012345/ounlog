import type { SajuFormState } from './types'

const SAJU_FORM_STORAGE_KEY = 'saju-form'

function isSajuFormState(value: unknown): value is SajuFormState {
  if (typeof value !== 'object' || value === null) {
    return false
  }

  const form = value as Record<string, unknown>

  return (
    typeof form.birthDate === 'string' &&
    form.birthDate !== '' &&
    typeof form.birthTime === 'string' &&
    form.birthTime !== '' &&
    (form.calendarType === 'SOLAR' || form.calendarType === 'LUNAR') &&
    (form.gender === 'MALE' || form.gender === 'FEMALE') &&
    typeof form.isLeapMonth === 'boolean' &&
    (form.calendarType === 'LUNAR' || !form.isLeapMonth)
  )
}

export function saveSajuForm(form: SajuFormState): void {
  sessionStorage.setItem(SAJU_FORM_STORAGE_KEY, JSON.stringify(form))
}

export function getSajuForm(): SajuFormState | null {
  const storedForm = sessionStorage.getItem(SAJU_FORM_STORAGE_KEY)

  if (storedForm === null) {
    return null
  }

  try {
    const parsedForm: unknown = JSON.parse(storedForm)

    return isSajuFormState(parsedForm) ? parsedForm : null
  } catch {
    return null
  }
}

export function clearSajuForm(): void {
  sessionStorage.removeItem(SAJU_FORM_STORAGE_KEY)
}
