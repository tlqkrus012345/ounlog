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
  workId: string
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
export type RecoverySelection =
  | { kind: 'none'; removeKeys: string[] }
  | { kind: 'unavailable'; removeKeys: string[] }
  | { kind: 'ready'; record: RecoveryRecord; removeKeys: string[] }

function hasRequiredInput(record: RecoveryRecord) {
  const fields = record.input
  if (
    record.targetPath === '/saju/birth-time' ||
    record.targetPath === '/saju/confirm'
  ) {
    if (
      !fields.birthDate ||
      !fields.calendarType ||
      !fields.gender ||
      typeof fields.isLeapMonth !== 'boolean'
    )
      return false
    if (record.targetPath === '/saju/confirm' && !fields.birthTime) return false
  }
  return true
}

// Inspect without deleting records during render. The caller applies cleanup after choosing a route.
export function inspectRecovery(
  path?: string,
  recordId?: string,
  workId?: string,
): RecoverySelection {
  const removeKeys: string[] = []
  let invalidForPath = false
  try {
    const records: RecoveryRecord[] = []
    for (const key of Object.keys(localStorage).filter((key) =>
      key.startsWith(PREFIX),
    )) {
      let target: unknown
      let recordWorkId: unknown
      try {
        const v = JSON.parse(localStorage.getItem(key)!)
        target = v?.targetPath
        recordWorkId = v?.workId ?? v?.id
        const input = pickSajuInput(v?.input)
        if (
          v.version !== 1 ||
          typeof v.id !== 'string' ||
          (v.workId !== undefined &&
            (typeof v.workId !== 'string' || !v.workId)) ||
          key !== PREFIX + v.id ||
          typeof v.ownerMemberId !== 'string' ||
          !/^[1-9][0-9]*$/.test(v.ownerMemberId) ||
          !paths.includes(v.targetPath) ||
          !Number.isFinite(v.createdAt) ||
          v.createdAt > Date.now() ||
          Date.now() - v.createdAt >= TTL ||
          !input
        ) {
          throw new Error('Invalid recovery')
        }
        const record: RecoveryRecord = {
          version: 1,
          id: v.id,
          // Legacy records stay recoverable, but never match a new draft's ID.
          workId: v.workId ?? v.id,
          ownerMemberId: v.ownerMemberId,
          targetPath: v.targetPath,
          createdAt: v.createdAt,
          input,
        }
        if (!hasRequiredInput(record)) throw new Error('Incomplete recovery')
        records.push(record)
      } catch {
        removeKeys.push(key)
        if (
          (!workId || recordWorkId === workId) &&
          (!path ||
            typeof target !== 'string' ||
            target === path ||
            !paths.includes(target))
        )
          invalidForPath = true
      }
    }
    const pointer = recordId ?? sessionStorage.getItem(POINTER)
    const exact = records.find(
      (r) =>
        r.id === pointer &&
        (!path || r.targetPath === path) &&
        (!workId || r.workId === workId),
    )
    if (exact) return { kind: 'ready', record: exact, removeKeys }
    if (recordId !== undefined) return { kind: 'unavailable', removeKeys }
    const matches = records.filter(
      (r) =>
        (!path || r.targetPath === path) && (!workId || r.workId === workId),
    )
    if (matches.length > 1)
      return {
        kind: 'unavailable',
        removeKeys: [...removeKeys, ...matches.map((r) => PREFIX + r.id)],
      }
    if (matches[0]) return { kind: 'ready', record: matches[0], removeKeys }
    return { kind: invalidForPath ? 'unavailable' : 'none', removeKeys }
  } catch {
    return { kind: 'unavailable', removeKeys }
  }
}
export function discardRecoveryKeys(keys: string[]) {
  try {
    keys.forEach((key) => localStorage.removeItem(key))
  } catch {
    // Never display a recovery whose storage cannot be read or updated.
  }
}
export function findRecovery(
  path?: string,
  recordId?: string,
): RecoveryRecord | null {
  const selection = inspectRecovery(path, recordId)
  discardRecoveryKeys(selection.removeKeys)
  return selection.kind === 'ready' ? selection.record : null
}
export function createRecovery(
  ownerMemberId: string,
  targetPath: string,
  input: Partial<SajuFormState>,
  workId: string = crypto.randomUUID(),
) {
  if (!paths.includes(targetPath)) return null
  const selection = inspectRecovery(undefined, undefined, workId)
  discardRecoveryKeys(selection.removeKeys)
  if (selection.kind === 'unavailable') return null
  if (
    selection.kind === 'ready' &&
    selection.record.ownerMemberId !== ownerMemberId
  )
    return null
  const record: RecoveryRecord = {
    version: 1,
    id: selection.kind === 'ready' ? selection.record.id : crypto.randomUUID(),
    workId,
    ownerMemberId,
    targetPath,
    createdAt:
      selection.kind === 'ready' ? selection.record.createdAt : Date.now(),
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
export function consumeRecovery(memberId: string, recordId?: string) {
  const record = findRecovery(undefined, recordId)
  if (
    !record ||
    record.ownerMemberId !== memberId ||
    !hasRequiredInput(record)
  ) {
    clearRecovery()
    clearSajuForm()
    return null
  }
  if (!saveSajuDraft(record.input, memberId, record.workId)) return null
  try {
    // Delete the source last: a failed save or pointer cleanup must keep it retryable.
    if (sessionStorage.getItem(POINTER) === record.id)
      sessionStorage.removeItem(POINTER)
    localStorage.removeItem(PREFIX + record.id)
    return record
  } catch {
    clearSajuForm()
    return null
  }
}
window.addEventListener(PRIVACY_CLEAR, clearRecovery)
