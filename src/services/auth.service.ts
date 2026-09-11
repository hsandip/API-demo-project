import { ApiError, httpClient, toApiError } from '../lib/axios'
import { API_ENDPOINTS } from '../constants/api'

// Shape of DummyJSON's raw login response — kept separate from the app-level
// AuthUser type since the wire field is `id`, not `authId`.
interface LoginResponse {
  id: number
  username: string
  email: string
  firstName: string
  lastName: string
  image: string
  accessToken: string
  refreshToken: string
}

interface DummyJsonUserSearchResult {
  users: Array<{ id: number; username: string; email: string }>
}

export interface PasswordResetRequest {
  // Demo-only stand-in for the email that a real backend would send — there
  // is no mail server here, so the flow hands the link straight back to the
  // caller to display instead.
  resetLink: string
}

const RESET_TOKEN_TTL_MS = 30 * 60 * 1000

// DummyJSON has no password-reset endpoint of its own and can't run
// server-side logic, so the "reset token" is generated and verified entirely
// client-side: it's just the target user id plus an expiry, base64-encoded.
// This is fine for a demo against fake data, but is not a substitute for a
// real, server-signed token — never reuse this pattern against a real backend.
function encodeResetToken(userId: number): string {
  return btoa(`${userId}:${Date.now() + RESET_TOKEN_TTL_MS}`)
}

function decodeResetToken(token: string): { userId: number; expiresAt: number } | null {
  try {
    const [userIdRaw, expiresAtRaw] = atob(token).split(':')
    const userId = Number(userIdRaw)
    const expiresAt = Number(expiresAtRaw)
    if (!Number.isFinite(userId) || !Number.isFinite(expiresAt)) return null
    return { userId, expiresAt }
  } catch {
    return null
  }
}

export const authApi = {
  async login(username: string, password: string): Promise<LoginResponse> {
    try {
      const { data } = await httpClient.post<LoginResponse>(API_ENDPOINTS.auth.login, {
        username,
        password,
      })
      return data
    } catch (error) {
      throw toApiError(error)
    }
  },

  // Resolves to `null` (never rejects on a not-found identifier) so the UI
  // can show an identical message either way and avoid leaking which
  // usernames/emails are registered.
  async requestPasswordReset(identifier: string): Promise<PasswordResetRequest | null> {
    try {
      const { data } = await httpClient.get<DummyJsonUserSearchResult>(API_ENDPOINTS.auth.userSearch, {
        params: { q: identifier },
      })
      const match = data.users.find(
        (candidate) =>
          candidate.username.toLowerCase() === identifier.toLowerCase() ||
          candidate.email.toLowerCase() === identifier.toLowerCase(),
      )
      if (!match) return null

      const token = encodeResetToken(match.id)
      return { resetLink: `/reset-password?token=${encodeURIComponent(token)}` }
    } catch (error) {
      throw toApiError(error)
    }
  },

  async resetPassword(token: string, newPassword: string): Promise<void> {
    const decoded = decodeResetToken(token)
    if (!decoded) {
      throw new ApiError('This reset link is invalid.', 400)
    }
    if (decoded.expiresAt < Date.now()) {
      throw new ApiError('This reset link has expired. Please request a new one.', 400)
    }

    try {
      await httpClient.put(API_ENDPOINTS.auth.userUpdate(decoded.userId), { password: newPassword })
    } catch (error) {
      throw toApiError(error)
    }
  },
}
