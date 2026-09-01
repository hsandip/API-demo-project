import { createContext } from 'react'
import type { AuthUser } from '../types/user'

export interface AuthContextValue {
  isAuthenticated: boolean
  user: AuthUser | null
  login: (username: string, password: string) => Promise<void>
  logout: () => void
}

export const AuthContext = createContext<AuthContextValue | null>(null)
