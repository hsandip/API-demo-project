import { supabase } from '../../lib/supabaseClient.js'
import { ApiError } from '../../lib/ApiError.js'
import { applyWhereFilter, buildPagedResult, parseWhere, type PagedResult } from '../../lib/queryHelpers.js'
import type { User, UserInput } from './users.types.js'

export interface ListUsersQuery {
  page: number
  perPage: number
  sort?: string
  where?: string
}

const TABLE = 'users'

function generateNumericId(): string {
  return String(Math.floor(1000 + Math.random() * 9000))
}

async function idExists(id: string): Promise<boolean> {
  const { data, error } = await supabase.from(TABLE).select('id').eq('id', id).maybeSingle()
  if (error) throw new ApiError(502, `Supabase error: ${error.message}`)
  return data !== null
}

// Honors a caller-supplied id when it's a non-empty string that doesn't
// collide with an existing user (mirrors the frontend's client-generated
// numeric ids); otherwise generates one, re-rolling on collision.
async function resolveId(requestedId: string | undefined): Promise<string> {
  if (requestedId && !(await idExists(requestedId))) return requestedId

  let candidate = generateNumericId()
  while (await idExists(candidate)) {
    candidate = generateNumericId()
  }
  return candidate
}

export const usersService = {
  async list(query: ListUsersQuery): Promise<PagedResult<User>> {
    let q = supabase.from(TABLE).select('*', { count: 'exact' })

    const where = parseWhere(query.where)
    if (where) q = applyWhereFilter(q, where)

    if (query.sort) {
      const descending = query.sort.startsWith('-')
      const field = descending ? query.sort.slice(1) : query.sort
      q = q.order(field, { ascending: !descending })
    }

    const start = (query.page - 1) * query.perPage
    const { data, count, error } = await q.range(start, start + query.perPage - 1)
    if (error) throw new ApiError(502, `Supabase error: ${error.message}`)

    return buildPagedResult((data ?? []) as User[], count ?? 0, query.page, query.perPage)
  },

  async getById(id: string): Promise<User> {
    const { data, error } = await supabase.from(TABLE).select('*').eq('id', id).maybeSingle()
    if (error) throw new ApiError(502, `Supabase error: ${error.message}`)
    if (!data) throw ApiError.notFound(`User ${id} not found`)
    return data as User
  },

  async create(input: UserInput & { id?: string }): Promise<User> {
    const { id: requestedId, ...rest } = input
    const id = await resolveId(requestedId)

    const { data, error } = await supabase
      .from(TABLE)
      .insert({ ...rest, id })
      .select()
      .single()
    if (error) throw new ApiError(502, `Supabase error: ${error.message}`)
    return data as User
  },

  async update(id: string, input: UserInput): Promise<User> {
    const { data, error } = await supabase.from(TABLE).update(input).eq('id', id).select().maybeSingle()
    if (error) throw new ApiError(502, `Supabase error: ${error.message}`)
    if (!data) throw ApiError.notFound(`User ${id} not found`)
    return data as User
  },

  async remove(id: string): Promise<void> {
    const { data, error } = await supabase.from(TABLE).delete().eq('id', id).select().maybeSingle()
    if (error) throw new ApiError(502, `Supabase error: ${error.message}`)
    if (!data) throw ApiError.notFound(`User ${id} not found`)
  },
}
