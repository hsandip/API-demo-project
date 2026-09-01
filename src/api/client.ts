import axios from 'axios'
import { tokenStorage } from '../auth/tokenStorage'

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

// Local json-server instance backing both the Users CRUD table and image
// upload/delete (see src/api/users.ts and src/api/upload.ts).
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
