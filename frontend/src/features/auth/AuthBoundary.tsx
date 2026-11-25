import { useEffect, useState, type PropsWithChildren } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { authRuntime } from './runtime'
import { AuthStatus } from './AuthStatus'
import { useAuth } from './useAuth'

export function AuthBoundary({ children }: PropsWithChildren) {
  const auth = useAuth()
  const location = useLocation()
  const [checked, setChecked] = useState<string | null>(null)
  const key = location.key + auth.epoch
  const hasToken = auth.accessToken !== null
  useEffect(() => {
    let active = true
    if (hasToken)
      void authRuntime.verify().then(() => {
        if (active) setChecked(key)
      })
    const show = (event: PageTransitionEvent) => {
      if (event.persisted) {
        setChecked(null)
        void authRuntime.verify().then(() => {
          if (active) setChecked(key)
        })
      }
    }
    window.addEventListener('pageshow', show)
    return () => {
      active = false
      window.removeEventListener('pageshow', show)
    }
  }, [key, hasToken])
  if (auth.logoutState !== 'idle') return null
  if (auth.status === 'guest')
    return <Navigate to="/login" replace state={{ recoveryId: null }} />
  if (auth.status === 'reauthRequired') return null
  if (auth.status !== 'authenticated' || checked !== key) return <AuthStatus />
  return children
}
