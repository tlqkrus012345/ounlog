import { PRIVACY_CLEAR } from '../auth/privacy'
import { authRuntime } from '../auth/runtime'
import type { SajuAnalysisCreationResult } from './types'
let saved: {
  memberId: string
  epoch: string
  result: SajuAnalysisCreationResult
} | null = null
export function saveAnalysisResult(result: SajuAnalysisCreationResult) {
  const auth = authRuntime.getSnapshot()
  if (auth.status === 'authenticated' && auth.session)
    saved = { memberId: auth.session.memberId, epoch: auth.epoch, result }
}
export function getAnalysisResult() {
  const auth = authRuntime.getSnapshot()
  return auth.status === 'authenticated' &&
    auth.session?.memberId === saved?.memberId &&
    auth.epoch === saved?.epoch
    ? saved.result
    : null
}
window.addEventListener(PRIVACY_CLEAR, () => {
  saved = null
})
