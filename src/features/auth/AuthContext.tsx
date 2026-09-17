import { useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { toast } from 'sonner'
import { authApi } from '../../services/auth.service'
import { refreshAccessToken } from '../../lib/axios'
import { tokenStorage } from './tokenStorage'
import { onSessionExpired } from './authEvents'
import type { AuthUser } from '../../types/user'
import { AuthContext } from './context'
import type { AuthContextValue } from './context'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => {
    const storedUser = tokenStorage.getUser()
    // A user record with no refresh token is a session that can never be
    // turned back into a usable access token — treat it as logged out.
    if (storedUser && !tokenStorage.getRefreshToken()) {
      tokenStorage.clear()
      return null
    }
    return storedUser
  })

  useEffect(() => {
    return onSessionExpired(() => {
      setUser((current) => {
        if (current === null) return current
        toast.error('Your session has expired. Please sign in again.')
        return null
      })
    })
  }, [])

  // The access token lives in memory only (see tokenStorage), so a hard
  // reload wipes it even though the persisted user/refresh token still say
  // "logged in". Re-mint it from the refresh token here rather than waiting
  // for the first 401, so a stored session is actually usable right away.
  useEffect(() => {
    if (!user || tokenStorage.getAccessToken()) return

    // The init-time check above already cleared any stored user that has no
    // refresh token, so one is guaranteed to be here.
    const refreshToken = tokenStorage.getRefreshToken()!
    refreshAccessToken(refreshToken).catch(() => {
      tokenStorage.clear()
      setUser(null)
    })
    // Runs once at mount against the state `user` was initialized with —
    // login/logout already manage the access token themselves and don't need
    // this effect to re-run.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      isAuthenticated: user !== null,
      user,
      login: async (username, password) => {
        const response = await authApi.login(username, password)
        const authUser: AuthUser = {
          authId: response.id,
          username: response.username,
          email: response.email,
          firstName: response.firstName,
          lastName: response.lastName,
          image: response.image,
        }
        tokenStorage.save({
          accessToken: response.accessToken,
          refreshToken: response.refreshToken,
          user: authUser,
        })
        setUser(authUser)
      },
      logout: () => {
        tokenStorage.clear()
        setUser(null)
      },
    }),
    [user],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
