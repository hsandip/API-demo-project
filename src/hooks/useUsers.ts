import { useEffect, useRef, useState } from 'react'
import { usersApi } from '../services/user.service'
import { DEFAULT_PAGE, DEFAULT_PAGE_SIZE, SEARCH_DEBOUNCE_MS } from '../constants/users'
import type { GenderFilter, SortOrder, User, UserSortField } from '../types/user'

interface FilterKey {
  debouncedSearch: string
  gender: GenderFilter
  sortBy: UserSortField
  sortOrder: SortOrder
  perPage: number
  hasUserSorted: boolean
}

function filtersEqual(a: FilterKey, b: FilterKey): boolean {
  return (
    a.debouncedSearch === b.debouncedSearch &&
    a.gender === b.gender &&
    a.sortBy === b.sortBy &&
    a.sortOrder === b.sortOrder &&
    a.perPage === b.perPage &&
    a.hasUserSorted === b.hasUserSorted
  )
}

export function useUsers() {
  const [page, setPage] = useState(DEFAULT_PAGE)
  const [perPage, setPerPage] = useState(DEFAULT_PAGE_SIZE)
  const [searchInput, setSearchInput] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [gender, setGender] = useState<GenderFilter>('all')
  const [sortBy, setSortBy] = useState<UserSortField>('firstName')
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc')
  // Whether the user has actually clicked a sortable column yet. Until they
  // do, no explicit sort is sent to the API — the backend then applies its
  // own default order (newest-created first), so a just-added user shows up
  // on top instead of wherever it happens to fall alphabetically.
  const [hasUserSorted, setHasUserSorted] = useState(false)

  const [users, setUsers] = useState<User[]>([])
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  // Blocks the table only for the very first load — see the merged fetch
  // effect below, which never sets this back to true on a later refetch.
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState('')

  // Bumped by reload()/reloadAfterDelete() to re-run the fetch effect below
  // without changing any actual query parameter (e.g. after create/update/delete).
  const [reloadToken, setReloadToken] = useState(0)

  const hasLoadedOnceRef = useRef(false)
  const isFirstRunRef = useRef(true)
  const prevFiltersRef = useRef<FilterKey>({
    debouncedSearch,
    gender,
    sortBy,
    sortOrder,
    perPage,
    hasUserSorted,
  })

  // Debounce raw typing before it drives a network request.
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchInput.trim()), SEARCH_DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [searchInput])

  // Single effect for both "a filter/sort/page-size change invalidates the
  // current page" and "fetch the users for the current page". Keeping these
  // in one effect (instead of a separate page-reset effect writing `page`)
  // means a filter change never fires a wasted request against the stale
  // page before the reset to page 1 lands — it fires exactly one request.
  useEffect(() => {
    const controller = new AbortController()

    async function fetchUsers(pageToFetch: number) {
      if (!hasLoadedOnceRef.current) setIsLoading(true)
      setLoadError('')
      try {
        const result = await usersApi.list(
          {
            page: pageToFetch,
            perPage,
            search: debouncedSearch,
            gender,
            // Omitted until the user picks a column to sort by, so the
            // request carries no `_sort` and the backend's own default
            // (newest-created-first) ordering applies.
            sortBy: hasUserSorted ? sortBy : undefined,
            sortOrder,
          },
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
        if (!controller.signal.aborted) {
          hasLoadedOnceRef.current = true
          setIsLoading(false)
        }
      }
    }

    if (isFirstRunRef.current) {
      isFirstRunRef.current = false
      fetchUsers(page)
      return () => controller.abort()
    }

    const nextFilters: FilterKey = {
      debouncedSearch,
      gender,
      sortBy,
      sortOrder,
      perPage,
      hasUserSorted,
    }
    const filtersChanged = !filtersEqual(prevFiltersRef.current, nextFilters)
    prevFiltersRef.current = nextFilters

    if (filtersChanged && page !== 1) {
      // Only reset the page here — this effect re-runs once `page` becomes
      // 1 (it's a dependency below) and fetches then, so we don't issue a
      // request against a page number that no longer applies.
      setPage(1)
      return () => controller.abort()
    }

    fetchUsers(page)
    return () => controller.abort()
  }, [page, perPage, debouncedSearch, gender, sortBy, sortOrder, hasUserSorted, reloadToken])

  function toggleSort(field: UserSortField) {
    setHasUserSorted(true)
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

  // Call after a successful create so the newly added user (which the
  // backend places first in the default, unsorted order) is actually
  // visible — jumps back to page 1 if the user wasn't already there,
  // otherwise just reloads it.
  function reloadAfterCreate() {
    if (page !== 1) {
      setPage(1)
    } else {
      reload()
    }
  }

  // Optimistic local mutations so Edit/Delete can update the visible table
  // immediately from data we already have, instead of waiting on (and
  // blocking on) a full list refetch. Callers still trigger a background
  // reload()/reloadAfterDelete() afterwards to stay in sync with sorting,
  // filtering, and pagination counts.
  function patchUserLocally(id: string, updated: User) {
    setUsers((prev) => prev.map((existing) => (existing.id === id ? updated : existing)))
  }

  function removeUserLocally(id: string) {
    setUsers((prev) => prev.filter((existing) => existing.id !== id))
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
    // null until the user actually clicks a column header — see
    // `hasUserSorted` above. Consumers (the column-header chevrons) should
    // treat null as "no column is the active sort".
    sortBy: hasUserSorted ? sortBy : null,
    sortOrder: hasUserSorted ? sortOrder : null,
    hasActiveFilters,
    setPage,
    setPerPage,
    setSearchInput,
    setGender,
    toggleSort,
    reload,
    reloadAfterDelete,
    reloadAfterCreate,
    patchUserLocally,
    removeUserLocally,
  }
}
