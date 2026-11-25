import { PRIVACY_CLEAR } from '../auth/privacy'
import { authRuntime } from '../auth/runtime'
import type { SajuFormState } from './types'

const KEY = 'saju-form'
export function pickSajuInput(value: unknown): Partial<SajuFormState> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const v = value as Record<string, unknown>
  const input: Partial<SajuFormState> = {}
  for (const key of ['birthDate', 'birthTime'] as const) {
    if (v[key] !== undefined) {
      if (
        typeof v[key] !== 'string' ||
        (key === 'birthDate'
          ? !/^\d{4}-\d{2}-\d{2}$/.test(v[key])
          : !/^\d{2}:\d{2}$/.test(v[key]))
      )
        return null
      if (
        key === 'birthDate' &&
        (v[key].startsWith('0000') ||
          !Number.isFinite(Date.parse(v[key] + 'T00:00:00Z')) ||
          new Date(v[key] + 'T00:00:00Z').toISOString().slice(0, 10) !== v[key])
      )
        return null
      if (
        key === 'birthTime' &&
        (Number(v[key].slice(0, 2)) > 23 || Number(v[key].slice(3)) > 59)
      )
        return null
      input[key] = v[key]
    }
  }
  if (v.calendarType !== undefined) {
    if (v.calendarType !== 'SOLAR' && v.calendarType !== 'LUNAR') return null
    input.calendarType = v.calendarType
  }
  if (v.gender !== undefined) {
    if (v.gender !== 'MALE' && v.gender !== 'FEMALE') return null
    input.gender = v.gender
  }
  if (v.isLeapMonth !== undefined) {
    if (typeof v.isLeapMonth !== 'boolean') return null
    input.isLeapMonth = v.isLeapMonth
  }
  if (input.calendarType === 'SOLAR' && input.isLeapMonth) return null
  return input
}
export function readDraft() {
  try {
    const v = JSON.parse(sessionStorage.getItem(KEY) ?? 'null')
    const input = pickSajuInput(v?.input)
    return input &&
      (v.workId === undefined ||
        (typeof v.workId === 'string' && v.workId.length > 0)) &&
      (v.ownerMemberId === null ||
        (typeof v.ownerMemberId === 'string' &&
          /^[1-9][0-9]*$/.test(v.ownerMemberId)))
      ? {
          input,
          ownerMemberId: v.ownerMemberId as string | null,
          workId: v.workId as string | undefined,
        }
      : null
  } catch {
    return null
  }
}
export function saveSajuDraft(
  form: Partial<SajuFormState>,
  owner = authRuntime.getSnapshot().session?.memberId ?? null,
  workId?: string,
): boolean {
  const input = pickSajuInput(form)
  if (!input) return false
  try {
    const previous = readDraft()
    const sameWork =
      previous &&
      (previous.ownerMemberId === null || previous.ownerMemberId === owner)
    sessionStorage.setItem(
      KEY,
      JSON.stringify({
        input,
        ownerMemberId: owner,
        workId:
          workId ??
          (sameWork ? previous.workId : undefined) ??
          crypto.randomUUID(),
      }),
    )
    return true
  } catch {
    // Public input may continue, but recovery must require a successful save.
    return false
  }
}
export function getSajuDraft(): Partial<SajuFormState> | null {
  const draft = readDraft()
  const auth = authRuntime.getSnapshot()
  if (
    draft?.ownerMemberId &&
    (auth.status !== 'authenticated' ||
      auth.session?.memberId !== draft.ownerMemberId)
  )
    return null
  return draft?.input ?? null
}
export function saveSajuForm(form: SajuFormState): void {
  saveSajuDraft(form)
}
export function getSajuForm(): SajuFormState | null {
  const form = getSajuDraft()
  return form?.birthDate &&
    form.birthTime &&
    form.calendarType &&
    form.gender &&
    typeof form.isLeapMonth === 'boolean'
    ? (form as SajuFormState)
    : null
}
export function clearSajuForm(): void {
  try {
    sessionStorage.removeItem(KEY)
  } catch {
    /* Do not render stale data when storage is unavailable. */
  }
}
window.addEventListener(PRIVACY_CLEAR, clearSajuForm)
