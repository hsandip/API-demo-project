import { localApiClient, toApiError } from './client'
import type { User, UserInput } from '../types/user'

interface UserListResponse {
  users: User[]
  total: number
}

// json-server's PUT/PATCH send the request body straight through
// JSON.stringify, which drops any key whose value is `undefined` — so
// clearing an optional field (e.g. age, gender) to `undefined` in the form
// would silently fail to persist as cleared. Sending `null` instead is
// preserved by JSON.stringify and actually reaches the server.
export function nullifyUndefined<T extends object>(input: T): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(input)) {
    result[key] = value === undefined ? null : value
  }
  return result
}

// json-server only auto-generates an id when the request body omits one —
// and since our ids are strings, its auto-generation falls back to random
// alphanumeric strings rather than numbers. Generating the id ourselves as
// a random 4-digit number (re-rolling on collision) keeps ids numeric while
// avoiding the predictability of a sequential counter.
function randomNumericId(users: User[]): string {
  const usedIds = new Set(users.map((user) => user.id))

  let candidate: string
  do {
    candidate = String(Math.floor(1000 + Math.random() * 9000))
  } while (usedIds.has(candidate))

  return candidate
}

export const usersApi = {
  async list(signal?: AbortSignal): Promise<UserListResponse> {
    try {
      const { data } = await localApiClient.get<User[]>('/users', { signal })
      return { users: data, total: data.length }
    } catch (error) {
      throw toApiError(error)
    }
  },

  async getById(id: string, signal?: AbortSignal): Promise<User> {
    try {
      const { data } = await localApiClient.get<User>(`/users/${id}`, { signal })
      return data
    } catch (error) {
      throw toApiError(error)
    }
  },

  async create(input: UserInput): Promise<User> {
    try {
      const { data: existingUsers } = await localApiClient.get<User[]>('/users')
      const id = randomNumericId(existingUsers)
      const { data } = await localApiClient.post<User>('/users', { id, ...input })
      return data
    } catch (error) {
      throw toApiError(error)
    }
  },

  async update(id: string, input: UserInput): Promise<User> {
    try {
      const { data } = await localApiClient.put<User>(`/users/${id}`, nullifyUndefined(input))
      return data
    } catch (error) {
      throw toApiError(error)
    }
  },

  async remove(id: string): Promise<void> {
    try {
      await localApiClient.delete(`/users/${id}`)
    } catch (error) {
      throw toApiError(error)
    }
  },
}
