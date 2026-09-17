import { useEffect, useRef, useState } from 'react'
import { usersApi } from '../services/user.service'
import { DEFAULT_PAGE, DEFAULT_PAGE_SIZE, SEARCH_DEBOUNCE_MS } from '../constants/users'
import type { GenderFilter, SortOrder, User, UserSortField } from '../types/user'

export function useUsers() {
  const [page, setPage] = useState(DEFAULT_PAGE)
  const [perPage, setPerPage] = useState(DEFAULT_PAGE_SIZE)
  const [searchInput, setSearchInput] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [gender, setGender] = useState<GenderFilter>('all')
  const [sortBy, setSortBy] = useState<UserSortField>('firstName')
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc')

  const [users, setUsers] = useState<User[]>([])
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState('')

  // Bumped by reload()/reloadAfterDelete() to re-run the fetch effect below
  // without changing any actual query parameter (e.g. after create/update/delete).
  const [reloadToken, setReloadToken] = useState(0)

  // Debounce raw typing before it drives a network request.
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchInput.trim()), SEARCH_DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [searchInput])

  // Any filter/sort/page-size change invalidates the current page — jump
  // back to page 1 so we don't end up requesting a page that no longer
  // exists under the new criteria.
  const firstRenderRef = useRef(true)
  useEffect(() => {
    if (firstRenderRef.current) {
      firstRenderRef.current = false
      return
    }
    setPage(1)
  }, [debouncedSearch, gender, sortBy, sortOrder, perPage])

  useEffect(() => {
    const controller = new AbortController()

    async function fetchUsers() {
      setIsLoading(true)
      setLoadError('')
      try {
        const result = await usersApi.list(
          { page, perPage, search: debouncedSearch, gender, sortBy, sortOrder },
          controller.signal,
        )
        setUsers(result.users)
        setTotal(result.total)
        setTotalPages(result.totalPages)
      } catch {
        // A signal aborted by our own effect cleanup (e.g. React StrictMode's
        // double-invoke in dev, a real unmount, or a newer request
        // superseding this one) isn't a real failure.
        if (controller.signal.aborted) return
        setLoadError('Failed to load users. Please try again.')
      } finally {
        if (!controller.signal.aborted) setIsLoading(false)
      }
    }

    fetchUsers()
    return () => controller.abort()
  }, [page, perPage, debouncedSearch, gender, sortBy, sortOrder, reloadToken])

  function toggleSort(field: UserSortField) {
    if (field === sortBy) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortBy(field)
      setSortOrder('asc')
    }
  }

  function reload() {
    setReloadToken((prev) => prev + 1)
  }

  // Call after a delete that may have emptied the last item on a page past
  // the first — steps back a page instead of leaving the view stranded on
  // a page that no longer has any rows.
  function reloadAfterDelete(remainingOnPage: number) {
    if (remainingOnPage === 0 && page > 1) {
      setPage((prev) => prev - 1)
    } else {
      reload()
    }
  }

  const hasActiveFilters = debouncedSearch.trim().length > 0 || gender !== 'all'

  return {
    users,
    total,
    totalPages,
    page,
    perPage,
    isLoading,
    loadError,
    searchInput,
    gender,
    sortBy,
    sortOrder,
    hasActiveFilters,
    setPage,
    setPerPage,
    setSearchInput,
    setGender,
    toggleSort,
    reload,
    reloadAfterDelete,
  }
}
