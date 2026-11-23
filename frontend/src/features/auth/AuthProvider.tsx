import { useEffect, useSyncExternalStore, type PropsWithChildren } from 'react'
import { AuthContext } from './AuthContext'
import { authRuntime } from './runtime'

export function AuthProvider({ children }: PropsWithChildren) {
  const snapshot = useSyncExternalStore(
    authRuntime.subscribe,
    authRuntime.getSnapshot,
  )
  useEffect(() => {
    authRuntime.connect()
    if (authRuntime.getSnapshot().status === 'checking')
      void authRuntime.restore()
  }, [])
  return (
    <AuthContext.Provider
      value={{
        ...snapshot,
        login: authRuntime.login,
        logout: authRuntime.logout,
        retry: authRuntime.verify,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}
