export interface LoginRequest {
  email: string
  password: string
}

export interface LoginResponse {
  accessToken: string
  tokenType: 'Bearer'
}

export interface AuthContextValue {
  accessToken: string | null
  setAccessToken: (token: string) => void
  clearAccessToken: () => void
}
