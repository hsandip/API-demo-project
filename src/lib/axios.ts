import axios from 'axios'
import type { InternalAxiosRequestConfig } from 'axios'
import { tokenStorage } from '../features/auth/tokenStorage'
import { emitSessionExpired } from '../features/auth/authEvents'
import { API_ENDPOINTS } from '../constants/api'

export class ApiError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

function requireEnv(value: string | undefined, name: string): string {
  if (!value) {
    throw new Error(
      `Missing required environment variable: ${name}. Check your .env file (see .env.example).`,
    )
  }
  return value
}

export const httpClient = axios.create({
  baseURL: requireEnv(import.meta.env.VITE_API_BASE_URL, 'VITE_API_BASE_URL'),
})

httpClient.interceptors.request.use((config) => {
  const token = tokenStorage.getAccessToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// A single in-flight refresh is shared across every request that hits a 401
// at the same time, so a burst of concurrent calls doesn't spend the refresh
// token more than once.
let refreshPromise: Promise<string> | null = null

async function refreshAccessToken(refreshToken: string): Promise<string> {
  const { data } = await axios.post<{ accessToken: string; refreshToken: string }>(
    `${httpClient.defaults.baseURL}${API_ENDPOINTS.auth.refresh}`,
    { refreshToken },
  )
  tokenStorage.updateTokens(data.accessToken, data.refreshToken)
  return data.accessToken
}

httpClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (!axios.isAxiosError(error) || error.response?.status !== 401) {
      return Promise.reject(error)
    }

    const originalRequest = error.config as (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined
    if (!originalRequest || originalRequest._retry || originalRequest.url === API_ENDPOINTS.auth.refresh) {
      tokenStorage.clear()
      emitSessionExpired()
      return Promise.reject(error)
    }

    const refreshToken = tokenStorage.getRefreshToken()
    if (!refreshToken) {
      tokenStorage.clear()
      emitSessionExpired()
      return Promise.reject(error)
    }

    originalRequest._retry = true
    try {
      refreshPromise ??= refreshAccessToken(refreshToken).finally(() => {
        refreshPromise = null
      })
      const accessToken = await refreshPromise
      originalRequest.headers.set('Authorization', `Bearer ${accessToken}`)
      return httpClient(originalRequest)
    } catch (refreshError) {
      tokenStorage.clear()
      emitSessionExpired()
      return Promise.reject(refreshError)
    }
  },
)

// Local json-server instance backing both the Users CRUD table and image
// upload/delete (see src/services/user.service.ts and upload.service.ts).
export const localApiClient = axios.create({
  baseURL: requireEnv(import.meta.env.VITE_LOCAL_API_URL, 'VITE_LOCAL_API_URL'),
})

export function toApiError(error: unknown): ApiError {
  if (axios.isAxiosError(error)) {
    const status = error.response?.status ?? 0
    const data = error.response?.data as { message?: string } | undefined
    return new ApiError(data?.message ?? error.message, status)
  }
  return new ApiError('Unexpected error', 0)
}
