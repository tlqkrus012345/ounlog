import { useMemo, useState, type PropsWithChildren } from 'react'
import { AuthContext } from './AuthContext'

export function AuthProvider({ children }: PropsWithChildren) {
  const [accessToken, setAccessToken] = useState<string | null>(null)

  const value = useMemo(
    () => ({
      accessToken,
      setAccessToken,
      clearAccessToken: () => setAccessToken(null),
    }),
    [accessToken],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
