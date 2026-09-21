// Parses and translates the frontend's json-server-style list-query
// contract (see vite-project's src/services/user.service.ts
// `buildUserListQuery`) into Supabase/PostgREST filters: `_page`/`_per_page`
// pagination, a single `_sort` field (optionally `-`-prefixed for
// descending), and a `_where` JSON clause supporting `eq`/`contains`
// operators plus a top-level `or` of single-field sub-clauses.

export interface PagedResult<T> {
  first: number
  prev: number | null
  next: number | null
  last: number
  pages: number
  items: number
  data: T[]
}

export function buildPagedResult<T>(data: T[], totalItems: number, page: number, perPage: number): PagedResult<T> {
  const pages = Math.max(1, Math.ceil(totalItems / perPage))
  const clampedPage = Math.min(Math.max(1, page), pages)

  return {
    first: 1,
    prev: clampedPage > 1 ? clampedPage - 1 : null,
    next: clampedPage < pages ? clampedPage + 1 : null,
    last: pages,
    pages,
    items: totalItems,
    data,
  }
}

type WhereOperator = { eq: unknown } | { contains: unknown }
export type WhereClause = { or?: Record<string, WhereOperator>[] } & Record<string, WhereOperator | unknown>

export function parseWhere(raw: string | undefined): WhereClause | null {
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw)
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as WhereClause
    }
    return null
  } catch {
    return null
  }
}

function toPostgrestFilter(field: string, operator: WhereOperator): string {
  if ('eq' in operator) return `${field}.eq.${operator.eq}`
  return `${field}.ilike.%${operator.contains}%`
}

// The subset of Supabase's PostgrestFilterBuilder this needs. Its real type
// threads the table's row/result generics through every chained call, which
// would have to be repeated here for no benefit — this helper only ever
// narrows filters, so it's constrained to this shape and typed to hand back
// exactly the builder type it was given.
interface FilterBuilder {
  eq(column: string, value: unknown): this
  ilike(column: string, pattern: string): this
  or(filters: string): this
}

// Applies a WhereClause onto a Supabase query builder. Only the shape our
// own frontend actually produces is supported: top-level `eq`/`contains`
// fields (ANDed via chained `.eq()`/`.ilike()` calls, PostgREST's default),
// plus one optional top-level `or` array of single-field clauses (turned
// into one `.or()` call, which ANDs as a single group against the rest).
export function applyWhereFilter<Q extends FilterBuilder>(query: Q, where: WhereClause): Q {
  let result: FilterBuilder = query
  for (const [key, condition] of Object.entries(where)) {
    if (key === 'or') {
      const branches = condition as Record<string, WhereOperator>[]
      const filter = branches
        .map((branch) => {
          const [field, operator] = Object.entries(branch)[0]
          return toPostgrestFilter(field, operator)
        })
        .join(',')
      result = result.or(filter)
      continue
    }

    const operator = condition as WhereOperator
    if ('eq' in operator) {
      result = result.eq(key, operator.eq)
    } else if ('contains' in operator) {
      result = result.ilike(key, `%${operator.contains}%`)
    }
  }
  return result as Q
}
