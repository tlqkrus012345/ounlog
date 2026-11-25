import { useEffect, useRef } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from './useAuth'
import { authRuntime } from './runtime'
import { AuthControls } from './AuthControls'
import { authCopy } from './copy'
import { AuthStatus } from './AuthStatus'
import {
  consumeRecovery,
  createRecovery,
  discardRecoveryKeys,
  inspectRecovery,
} from '../saju/recovery'
import { clearSajuForm, readDraft, saveSajuDraft } from '../saju/storage'

export function AuthLayout() {
  const auth = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const draft = readDraft()
  // A draft identifies this tab's work even while its input is hidden before authentication.
  const recovery =
    location.pathname.startsWith('/saju') && !draft
      ? inspectRecovery(location.pathname)
      : null
  const handled = useRef<string | null>(null)
  useEffect(() => {
    if (recovery && recovery.kind !== 'none') {
      if (auth.status === 'checking' || auth.status === 'checkError') return
      const transition = `${location.key}:${auth.epoch}:${auth.status}`
      if (handled.current === transition) return
      handled.current = transition
      discardRecoveryKeys(recovery.removeKeys)
      if (recovery.kind === 'unavailable') {
        clearSajuForm()
        if (auth.status === 'reauthRequired')
          navigate('/login', {
            replace: true,
            state: { reason: 'expired', recoveryId: null },
          })
        else navigate('/entry', { replace: true })
      } else if (auth.status === 'authenticated' && auth.session) {
        const restored = consumeRecovery(
          auth.session.memberId,
          recovery.record.id,
        )
        navigate(restored?.targetPath ?? '/entry', {
          replace: true,
          state: { resumed: !!restored, focusHeading: true },
        })
      } else {
        navigate('/login', {
          replace: true,
          state: { reason: 'expired', recoveryId: recovery.record.id },
        })
      }
      return
    }
    const owned = readDraft()
    if (
      auth.status === 'authenticated' &&
      owned?.ownerMemberId &&
      owned.ownerMemberId !== auth.session?.memberId
    ) {
      // Keep the child blocked until navigation commits; purging first can mount an empty form.
      if (location.pathname === '/entry') authRuntime.purge()
      else navigate('/entry', { replace: true })
      return
    }
    if (
      location.pathname.startsWith('/saju') &&
      (auth.status === 'reauthRequired' ||
        (auth.status === 'guest' && owned?.ownerMemberId))
    ) {
      const transition = `${location.key}:${auth.epoch}:${auth.status}`
      if (handled.current === transition) return
      handled.current = transition
      const data = readDraft()
      // Give legacy drafts their own identity instead of guessing from another task's pointer.
      const workReady =
        !data || !!data.workId || saveSajuDraft(data.input, data.ownerMemberId)
      const member = data?.ownerMemberId ?? auth.session?.memberId
      const created =
        workReady && member
          ? createRecovery(
              member,
              location.pathname,
              data?.input ?? {},
              readDraft()?.workId,
            )
          : null
      if (!created) clearSajuForm()
      navigate('/login', {
        replace: true,
        state: { reason: 'expired', recoveryId: created?.id ?? null },
      })
    }
  }, [
    auth.status,
    auth.session,
    auth.epoch,
    location.key,
    location.pathname,
    navigate,
    recovery,
  ])
  useEffect(() => {
    if (!location.state?.focusHeading) return
    const frame = requestAnimationFrame(() => {
      const heading = document.querySelector<HTMLElement>('main h1')
      heading?.setAttribute('tabindex', '-1')
      heading?.focus()
    })
    return () => cancelAnimationFrame(frame)
  }, [location.key, location.state])
  // The child page must not redirect or display a draft before recovery is resolved.
  if (recovery && recovery.kind !== 'none') {
    return auth.status === 'checking' || auth.status === 'checkError' ? (
      <AuthStatus />
    ) : null
  }
  if (auth.status === 'reauthRequired' && location.pathname.startsWith('/saju'))
    return null
  const protectedDraft =
    draft?.ownerMemberId &&
    (auth.status !== 'authenticated' ||
      draft.ownerMemberId !== auth.session?.memberId) &&
    location.pathname.startsWith('/saju')
  return (
    <>
      {(!['/entry', '/login'].includes(location.pathname) ||
        auth.logoutState !== 'idle') && <AuthControls />}
      {location.state?.resumed &&
        ['/saju/confirm', '/saju/analysis', '/saju/preview'].includes(
          location.pathname,
        ) && (
          <p className="auth-status" role="status">
            {authCopy.resume}
          </p>
        )}
      {auth.logoutState !== 'idle' ||
      (protectedDraft &&
        auth.status !== 'checking' &&
        auth.status !== 'checkError') ? null : protectedDraft &&
        (auth.status === 'checking' || auth.status === 'checkError') ? (
        <AuthStatus />
      ) : (
        <Outlet key={auth.privacyRevision} />
      )}
    </>
  )
}
