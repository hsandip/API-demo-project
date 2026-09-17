import { describe, expect, it } from 'vitest'
import { buildUserListQuery, nullifyUndefined } from './user.service'

describe('buildUserListQuery', () => {
  it('defaults to page 1 with the default page size and no filters', () => {
    const query = new URLSearchParams(buildUserListQuery({}))
    expect(query.get('_page')).toBe('1')
    expect(query.get('_per_page')).toBe('10')
    expect(query.has('_sort')).toBe(false)
    expect(query.has('_where')).toBe(false)
  })

  it('encodes page, page size and ascending sort', () => {
    const query = new URLSearchParams(
      buildUserListQuery({ page: 3, perPage: 25, sortBy: 'lastName', sortOrder: 'asc' }),
    )
    expect(query.get('_page')).toBe('3')
    expect(query.get('_per_page')).toBe('25')
    expect(query.get('_sort')).toBe('lastName')
  })

  it('prefixes descending sort with a dash', () => {
    const query = new URLSearchParams(buildUserListQuery({ sortBy: 'email', sortOrder: 'desc' }))
    expect(query.get('_sort')).toBe('-email')
  })

  it('encodes a gender filter as an exact-match _where clause using the eq operator', () => {
    // Plain `{ gender: 'female' }` equality is silently broken in the
    // patched json-server beta this project runs against (matchesWhere
    // always returns false for a bare-value field) — the `{ eq }` operator
    // form must be used instead. See buildUserListQuery's comment.
    const query = new URLSearchParams(buildUserListQuery({ gender: 'female' }))
    expect(JSON.parse(query.get('_where') ?? '{}')).toEqual({ gender: { eq: 'female' } })
  })

  it('encodes a search term as an OR of contains-clauses across searchable fields', () => {
    const query = new URLSearchParams(buildUserListQuery({ search: '  ada  ' }))
    const where = JSON.parse(query.get('_where') ?? '{}')
    expect(where.or).toEqual([
      { firstName: { contains: 'ada' } },
      { lastName: { contains: 'ada' } },
      { email: { contains: 'ada' } },
      { username: { contains: 'ada' } },
    ])
  })

  it('combines a gender filter and a search term into one _where clause', () => {
    const query = new URLSearchParams(buildUserListQuery({ gender: 'male', search: 'ada' }))
    const where = JSON.parse(query.get('_where') ?? '{}')
    expect(where.gender).toEqual({ eq: 'male' })
    expect(where.or).toHaveLength(4)
  })

  it('ignores a blank/whitespace-only search term', () => {
    const query = new URLSearchParams(buildUserListQuery({ search: '   ' }))
    expect(query.has('_where')).toBe(false)
  })
})

describe('nullifyUndefined', () => {
  it('leaves defined values untouched', () => {
    expect(nullifyUndefined({ firstName: 'Emily', age: 28 })).toEqual({
      firstName: 'Emily',
      age: 28,
    })
  })

  it('converts undefined values to null so JSON.stringify keeps the key', () => {
    const input = { age: undefined, gender: undefined, firstName: 'Emily' }
    const result = nullifyUndefined(input)
    expect(result).toEqual({ age: null, gender: null, firstName: 'Emily' })
    // The actual bug this guards against: JSON.stringify drops undefined
    // keys entirely, so a PATCH meant to clear a field would silently omit
    // it instead. Confirm the serialized form keeps the key.
    expect(JSON.stringify(result)).toContain('"age":null')
  })
})
