import type { GenderFilter, UserSortField } from '../types/user'

export const DEFAULT_PAGE = 1
export const DEFAULT_PAGE_SIZE = 10
export const PAGE_SIZE_OPTIONS = [5, 10, 25, 50] as const

export const SEARCH_DEBOUNCE_MS = 400

// Fields the local json-server backend can filter on with a `_contains`
// clause (see usersApi.list's `_where` query) — kept in one place so the
// search box and the service stay in sync about what "search" covers.
export const SEARCHABLE_FIELDS = ['firstName', 'lastName', 'email', 'username'] as const

export const GENDER_FILTER_OPTIONS: { value: GenderFilter; label: string }[] = [
  { value: 'all', label: 'All genders' },
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'other', label: 'Other' },
]

export const SORTABLE_COLUMNS: { field: UserSortField; label: string }[] = [
  { field: 'firstName', label: 'First Name' },
  { field: 'lastName', label: 'Last Name' },
  { field: 'email', label: 'Email' },
]
