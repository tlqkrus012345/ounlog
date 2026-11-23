import { PRIVACY_CLEAR } from '../auth/privacy'
import { pickSajuInput, saveSajuDraft, clearSajuForm } from './storage'
import type { SajuFormState } from './types'

const PREFIX = 'ounlog-recovery:'
const POINTER = 'ounlog-recovery-current'
const TTL = 24 * 60 * 60 * 1000
const paths = [
  '/saju',
  '/saju/birth-time',
  '/saju/confirm',
  '/saju/preview',
  '/saju/analysis',
]
export type RecoveryRecord = {
  version: 1
  id: string
  ownerMemberId: string
  targetPath: string
  createdAt: number
  input: Partial<SajuFormState>
}
export function clearRecovery() {
  try {
    Object.keys(localStorage)
      .filter((key) => key.startsWith(PREFIX))
      .forEach((key) => localStorage.removeItem(key))
    sessionStorage.removeItem(POINTER)
  } catch {
    /* Recovery stays unavailable when browser storage is blocked. */
  }
}
export function findRecovery(path?: string): RecoveryRecord | null {
  try {
    const records: RecoveryRecord[] = []
    for (const key of Object.keys(localStorage).filter((key) =>
      key.startsWith(PREFIX),
    )) {
      try {
        const v = JSON.parse(localStorage.getItem(key)!)
        const input = pickSajuInput(v.input)
        if (
          v.version !== 1 ||
          typeof v.id !== 'string' ||
          key !== PREFIX + v.id ||
          !/^[1-9][0-9]*$/.test(v.ownerMemberId) ||
          typeof v.ownerMemberId !== 'string' ||
          !paths.includes(v.targetPath) ||
          !Number.isFinite(v.createdAt) ||
          v.createdAt > Date.now() ||
          Date.now() - v.createdAt >= TTL ||
          !input
        )
          throw new Error('Invalid recovery')
        records.push({
          version: 1,
          id: v.id,
          ownerMemberId: v.ownerMemberId,
          targetPath: v.targetPath,
          createdAt: v.createdAt,
          input,
        })
      } catch {
        localStorage.removeItem(key)
      }
    }
    const pointer = sessionStorage.getItem(POINTER)
    const exact = records.find(
      (r) => r.id === pointer && (!path || r.targetPath === path),
    )
    if (exact) return exact
    const matches = records.filter((r) => !path || r.targetPath === path)
    if (matches.length > 1) {
      matches.forEach((r) => localStorage.removeItem(PREFIX + r.id))
      return null
    }
    return matches[0] ?? null
  } catch {
    return null
  }
}
export function createRecovery(
  ownerMemberId: string,
  targetPath: string,
  input: Partial<SajuFormState>,
) {
  if (!paths.includes(targetPath)) return null
  let pointer: string | null
  try {
    pointer = sessionStorage.getItem(POINTER)
  } catch {
    return null
  }
  const old = pointer ? findRecovery(targetPath) : null
  if (old?.id === pointer && old?.ownerMemberId === ownerMemberId) return old
  const record: RecoveryRecord = {
    version: 1,
    id: crypto.randomUUID(),
    ownerMemberId,
    targetPath,
    createdAt: Date.now(),
    input: pickSajuInput(input) ?? {},
  }
  try {
    localStorage.setItem(PREFIX + record.id, JSON.stringify(record))
    sessionStorage.setItem(POINTER, record.id)
    return record
  } catch {
    return null
  }
}
export function consumeRecovery(memberId: string) {
  const record = findRecovery()
  const fields = record?.input
  const missingStep =
    record?.targetPath === '/saju/birth-time' &&
    (!fields?.birthDate ||
      !fields.calendarType ||
      !fields.gender ||
      typeof fields.isLeapMonth !== 'boolean')
  const missingConfirm =
    record?.targetPath === '/saju/confirm' &&
    (!fields?.birthDate ||
      !fields.birthTime ||
      !fields.calendarType ||
      !fields.gender ||
      typeof fields.isLeapMonth !== 'boolean')
  if (
    !record ||
    record.ownerMemberId !== memberId ||
    missingStep ||
    missingConfirm
  ) {
    clearRecovery()
    clearSajuForm()
    return null
  }
  try {
    localStorage.removeItem(PREFIX + record.id)
    sessionStorage.removeItem(POINTER)
    saveSajuDraft(record.input, memberId)
    return record
  } catch {
    return null
  }
}
window.addEventListener(PRIVACY_CLEAR, clearRecovery)
