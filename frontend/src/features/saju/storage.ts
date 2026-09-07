import type { SajuFormState } from './types'

const SAJU_FORM_STORAGE_KEY = 'saju-form'

export function saveSajuForm(form: SajuFormState): void {
  sessionStorage.setItem(SAJU_FORM_STORAGE_KEY, JSON.stringify(form))
}

export function getSajuForm(): SajuFormState | null {
  const storedForm = sessionStorage.getItem(SAJU_FORM_STORAGE_KEY)

  if (storedForm === null) {
    return null
  }

  return JSON.parse(storedForm) as SajuFormState
}

export function clearSajuForm(): void {
  sessionStorage.removeItem(SAJU_FORM_STORAGE_KEY)
}
