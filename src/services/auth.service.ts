import { httpClient, toApiError } from '../lib/axios'
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
}
