import { localApiClient, toApiError } from '../lib/axios'
import { API_ENDPOINTS } from '../constants/api'
import { DEFAULT_PAGE, DEFAULT_PAGE_SIZE, SEARCHABLE_FIELDS } from '../constants/users'
import type { User, UserInput, UserListParams, UserListResult } from '../types/user'

// Shape json-server (patched, beta) returns for a list request once `_page`
// is present — a plain array otherwise. See node_modules/json-server/lib/paginate.js.
interface JsonServerPage<T> {
  first: number
  prev: number | null
  next: number | null
  last: number
  pages: number
  items: number
  data: T[]
}

// Builds the query string for a paginated/searched/filtered/sorted users
// list request. Exported (and kept pure/side-effect-free) so it can be unit
// tested without a live server — see user.service.test.ts.
export function buildUserListQuery(params: Partial<UserListParams>): string {
  const {
    page = DEFAULT_PAGE,
    perPage = DEFAULT_PAGE_SIZE,
    search = '',
    gender = 'all',
    sortBy,
    sortOrder = 'asc',
  } = params

  const query = new URLSearchParams()
  query.set('_page', String(page))
  query.set('_per_page', String(perPage))
  if (sortBy) query.set('_sort', sortOrder === 'desc' ? `-${sortBy}` : sortBy)

  // json-server's per-field query filters (`field_contains=`, etc.) only
  // AND together, so a multi-field "search any of these columns" needs the
  // raw `_where` JSON escape hatch to express an `or` clause instead.
  //
  // Note: plain `{ field: value }` equality is broken in this patched
  // json-server beta (matchesWhere always returns false for it) — the
  // `{ eq: value }` operator form must be used instead.
  const where: Record<string, unknown> = {}
  if (gender !== 'all') where.gender = { eq: gender }

  const term = search.trim()
  if (term) {
    where.or = SEARCHABLE_FIELDS.map((field) => ({ [field]: { contains: term } }))
  }

  if (Object.keys(where).length > 0) {
    query.set('_where', JSON.stringify(where))
  }

  return query.toString()
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
  async list(params: Partial<UserListParams> = {}, signal?: AbortSignal): Promise<UserListResult> {
    try {
      const queryString = buildUserListQuery(params)
      const { data } = await localApiClient.get<JsonServerPage<User>>(
        `${API_ENDPOINTS.users.list}?${queryString}`,
        { signal },
      )
      // The server clamps an out-of-range requested page to the nearest
      // valid one but doesn't echo the page number back directly — derive
      // it from prev/next instead of trusting the (possibly stale) request.
      const currentPage = data.next !== null ? data.next - 1 : data.prev !== null ? data.prev + 1 : 1

      return {
        users: data.data,
        total: data.items,
        page: currentPage,
        perPage: params.perPage ?? DEFAULT_PAGE_SIZE,
        totalPages: data.pages,
      }
    } catch (error) {
      throw toApiError(error)
    }
  },

  async getById(id: string, signal?: AbortSignal): Promise<User> {
    try {
      const { data } = await localApiClient.get<User>(API_ENDPOINTS.users.detail(id), { signal })
      return data
    } catch (error) {
      throw toApiError(error)
    }
  },

  async create(input: UserInput): Promise<User> {
    try {
      const { data: existingUsers } = await localApiClient.get<User[]>(API_ENDPOINTS.users.list)
      const id = randomNumericId(existingUsers)
      const { data } = await localApiClient.post<User>(API_ENDPOINTS.users.create, { id, ...input })
      return data
    } catch (error) {
      throw toApiError(error)
    }
  },

  async update(id: string, input: UserInput): Promise<User> {
    try {
      const { data } = await localApiClient.put<User>(
        API_ENDPOINTS.users.update(id),
        nullifyUndefined(input),
      )
      return data
    } catch (error) {
      throw toApiError(error)
    }
  },

  async remove(id: string): Promise<void> {
    try {
      await localApiClient.delete(API_ENDPOINTS.users.remove(id))
    } catch (error) {
      throw toApiError(error)
    }
  },
}
