import type { AuthUser } from '../../types/user'

const REFRESH_TOKEN_KEY = 'auth-refresh-token'
const USER_KEY = 'auth-user'

export interface StoredSession {
  accessToken: string
  refreshToken: string
  user: AuthUser
}

// A real app would keep both tokens in an httpOnly cookie set by the server,
// out of reach of any JS running on the page. DummyJSON is a third-party demo
// API — it can't set a cookie scoped to our origin — so there's no way to get
// that for real here. The next best thing: the access token, which rides on
// every authenticated request, is kept in this module-level variable only and
// never touches localStorage, so it can't be lifted by an XSS payload reading
// storage and doesn't outlive the tab. The refresh token still has to be
// persisted somewhere for the session to survive a reload — see
// AuthContext's boot-time silent refresh, which turns it back into an
// in-memory access token — so it keeps the old localStorage trade-off; it's
// used far less often and is the one DummyJSON lets a client invalidate
// (via re-login) independently of the access token.
let inMemoryAccessToken: string | null = null

export const tokenStorage = {
  save({ accessToken, refreshToken, user }: StoredSession) {
    inMemoryAccessToken = accessToken
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken)
    localStorage.setItem(USER_KEY, JSON.stringify(user))
  },
  clear() {
    inMemoryAccessToken = null
    localStorage.removeItem(REFRESH_TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
  },
  getAccessToken(): string | null {
    return inMemoryAccessToken
  },
  getRefreshToken(): string | null {
    return localStorage.getItem(REFRESH_TOKEN_KEY)
  },
  updateTokens(accessToken: string, refreshToken: string) {
    inMemoryAccessToken = accessToken
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken)
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
