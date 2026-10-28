import { useEffect, useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { usersApi } from '../services/user.service'
import { DEFAULT_PAGE, DEFAULT_PAGE_SIZE, SEARCH_DEBOUNCE_MS } from '../constants/users'
import type { GenderFilter, SortOrder, User, UserSortField, UserListResult } from '../types/user'

export function useUsers() {
  const queryClient = useQueryClient()

  const [page, setPage] = useState(DEFAULT_PAGE)
  const [perPage, setPerPage] = useState(DEFAULT_PAGE_SIZE)
  const [searchInput, setSearchInput] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [gender, setGender] = useState<GenderFilter>('all')
  const [sortBy, setSortBy] = useState<UserSortField>('firstName')
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc')
  const [hasUserSorted, setHasUserSorted] = useState(false)
  const [reloadToken, setReloadToken] = useState(0)

  const hasLoadedOnceRef = useRef(false)

  // Debounce raw typing before it drives a network request.
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchInput.trim()), SEARCH_DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [searchInput])

  const queryKey = [
    'users',
    page,
    perPage,
    debouncedSearch,
    gender,
    hasUserSorted ? sortBy : undefined,
    hasUserSorted ? sortOrder : undefined,
    reloadToken,
  ]

  const { data, isLoading, error } = useQuery({
    queryKey,
    queryFn: async () => {
      const result = await usersApi.list({
        page,
        perPage,
        search: debouncedSearch,
        gender,
        sortBy: hasUserSorted ? sortBy : undefined,
        sortOrder,
      })
      return result
    },
    staleTime: 1000 * 60, // 1 minute
  })

  const users = data?.users ?? []
  const total = data?.total ?? 0
  const totalPages = data?.totalPages ?? 1
  const loadError = error ? (error instanceof Error ? error.message : 'Failed to load users') : ''

  // Mark as loaded after first successful fetch
  useEffect(() => {
    if (!isLoading && data) {
      hasLoadedOnceRef.current = true
    }
  }, [isLoading, data])

  // Reset to page 1 when filters change
  useEffect(() => {
    if (page > 1 && (debouncedSearch || gender !== 'all' || perPage !== DEFAULT_PAGE_SIZE)) {
      setPage(1)
    }
  }, [debouncedSearch, gender, perPage])

  // Prefetch next page when current page loads
  useEffect(() => {
    if (totalPages > page && data) {
      const nextQueryKey: (string | number | boolean | undefined)[] = [
        'users',
        page + 1,
        perPage,
        debouncedSearch,
        gender,
        hasUserSorted ? sortBy : undefined,
        hasUserSorted ? sortOrder : undefined,
        reloadToken,
      ]
      queryClient.prefetchQuery({
        queryKey: nextQueryKey,
        queryFn: async () => {
          const result = await usersApi.list({
            page: page + 1,
            perPage,
            search: debouncedSearch,
            gender,
            sortBy: hasUserSorted ? sortBy : undefined,
            sortOrder,
          })
          return result
        },
        staleTime: 1000 * 60,
      })
    }
  }, [page, perPage, debouncedSearch, gender, sortBy, sortOrder, hasUserSorted, totalPages, data, reloadToken, queryClient])

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

  function reloadAfterDelete(remainingOnPage: number) {
    if (remainingOnPage === 0 && page > 1) {
      setPage((prev) => prev - 1)
    } else {
      reload()
    }
  }

  function reloadAfterCreate() {
    if (page !== 1) {
      setPage(1)
    } else {
      reload()
    }
  }

  function patchUserLocally(id: string, updated: User) {
    queryClient.setQueryData(queryKey, (oldData: UserListResult | undefined) => {
      if (!oldData) return oldData
      return {
        ...oldData,
        users: oldData.users.map((existing) => (existing.id === id ? updated : existing)),
      }
    })
  }

  function removeUserLocally(id: string) {
    queryClient.setQueryData(queryKey, (oldData: UserListResult | undefined) => {
      if (!oldData) return oldData
      return {
        ...oldData,
        users: oldData.users.filter((existing) => existing.id !== id),
      }
    })
  }

  const hasActiveFilters = debouncedSearch.trim().length > 0 || gender !== 'all'

  return {
    users,
    total,
    totalPages,
    page,
    perPage,
    isLoading: !hasLoadedOnceRef.current && isLoading,
    loadError,
    searchInput,
    gender,
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
