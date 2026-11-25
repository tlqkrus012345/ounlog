export interface LoginRequest {
  email: string
  password: string
}

export interface LoginResponse {
  accessToken: string
  tokenType: 'Bearer'
  accessTokenExpiresAt: string
  session: SessionResponse
}

export interface SessionResponse {
  memberId: string
  sessionExpiresAt: string
  absoluteExpiresAt: string
}

export interface AuthSnapshot {
  status:
    'checking' | 'authenticated' | 'guest' | 'reauthRequired' | 'checkError'
  accessToken: string | null
  session: SessionResponse | null
  epoch: string
  signInRequired?: boolean
  privacyRevision: number
  loginPending: boolean
  logoutState: 'idle' | 'pending' | 'error'
}

export interface AuthContextValue extends AuthSnapshot {
  login: (command: LoginRequest) => Promise<LoginResponse>
  logout: () => Promise<void>
  retry: () => Promise<void>
}
