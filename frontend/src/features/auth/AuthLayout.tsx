import { useEffect } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from './useAuth'
import { authRuntime } from './runtime'
import { AuthControls } from './AuthControls'
import { authCopy } from './copy'
import { AuthStatus } from './AuthStatus'
import { createRecovery } from '../saju/recovery'
import { readDraft } from '../saju/storage'

export function AuthLayout() {
  const auth = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const draft = readDraft()
  useEffect(() => {
    const owned = readDraft()
    if (
      auth.status === 'authenticated' &&
      owned?.ownerMemberId &&
      owned.ownerMemberId !== auth.session?.memberId
    )
      authRuntime.purge()
    if (
      auth.status === 'reauthRequired' &&
      location.pathname.startsWith('/saju')
    ) {
      const data = readDraft()
      const member = auth.session?.memberId ?? data?.ownerMemberId
      if (member) createRecovery(member, location.pathname, data?.input ?? {})
      navigate('/login', { replace: true, state: { reason: 'expired' } })
    }
  }, [auth.status, auth.session?.memberId, location.pathname, navigate])
  useEffect(() => {
    if (!location.state?.focusHeading) return
    const frame = requestAnimationFrame(() => {
      const heading = document.querySelector<HTMLElement>('main h1')
      heading?.setAttribute('tabindex', '-1')
      heading?.focus()
    })
    return () => cancelAnimationFrame(frame)
  }, [location.key, location.state])
  const protectedDraft =
    draft?.ownerMemberId &&
    auth.status !== 'authenticated' &&
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
        auth.status === 'reauthRequired') ? null : protectedDraft &&
        (auth.status === 'checking' || auth.status === 'checkError') ? (
        <AuthStatus />
      ) : (
        <Outlet key={auth.privacyRevision} />
      )}
    </>
  )
}
