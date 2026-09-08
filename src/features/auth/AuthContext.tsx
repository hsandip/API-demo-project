import { useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { authApi } from '../../services/auth.service'
import { tokenStorage } from './tokenStorage'
import type { AuthUser } from '../../types/user'
import { AuthContext } from './context'
import type { AuthContextValue } from './context'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => tokenStorage.getUser())

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
