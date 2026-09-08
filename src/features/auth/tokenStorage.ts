import type { AuthUser } from '../../types/user'

const ACCESS_TOKEN_KEY = 'auth-access-token'
const REFRESH_TOKEN_KEY = 'auth-refresh-token'
const USER_KEY = 'auth-user'

export interface StoredSession {
  accessToken: string
  refreshToken: string
  user: AuthUser
}

// Demo-only: a real app would keep tokens in an httpOnly cookie set by the
// server. localStorage is readable by any script on the page (XSS risk), but
// there's no server here to set cookies for, so this is the practical option.
export const tokenStorage = {
  save({ accessToken, refreshToken, user }: StoredSession) {
    localStorage.setItem(ACCESS_TOKEN_KEY, accessToken)
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken)
    localStorage.setItem(USER_KEY, JSON.stringify(user))
  },
  clear() {
    localStorage.removeItem(ACCESS_TOKEN_KEY)
    localStorage.removeItem(REFRESH_TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
  },
  getAccessToken(): string | null {
    return localStorage.getItem(ACCESS_TOKEN_KEY)
  },
  getUser(): AuthUser | null {
    const raw = localStorage.getItem(USER_KEY)
    if (!raw) return null
    try {
      return JSON.parse(raw) as AuthUser
    } catch {
      return null
    }
  },
}
