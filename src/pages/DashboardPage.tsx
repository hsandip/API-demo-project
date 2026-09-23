import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../features/auth/useAuth'
import { useUsers } from '../hooks/useUsers'
import { usersApi } from '../services/user.service'
import { ApiError } from '../lib/axios'
import type { User, UserInput } from '../types/user'
import { UserTable } from '../components/UserTable'
import { UsersToolbar } from '../components/UsersToolbar'
import { PaginationControls } from '../components/PaginationControls'
import { UserFormModal } from '../components/UserFormModal'
import { ConfirmDialog } from '../components/ConfirmDialog'
import type { ToastData } from '../components/Toast'
import { Button } from '@/components/ui/button'
import { toast as sonnerToast } from 'sonner'

const EMPTY_USER: UserInput = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  username: '',
  image: null,
}

type ModalState = { mode: 'create' } | { mode: 'edit'; user: User } | null

export function DashboardPage() {
  const { user: currentUser, logout } = useAuth()
  const navigate = useNavigate()

  const {
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
    reloadAfterCreate,
    patchUserLocally,
    removeUserLocally,
  } = useUsers()

  const [modalState, setModalState] = useState<ModalState>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [deleteTarget, setDeleteTarget] = useState<User | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  function notify(data: ToastData) {
    if (data.type === 'success') sonnerToast.success(data.message)
    else sonnerToast.error(data.message)
  }

  function handleLogout() {
    logout()
    navigate('/login', { replace: true })
  }

  // The row clicked already came from the users list we just fetched, so
  // there's no need to round-trip a GET /users/:id before opening the modal
  // — that was a duplicate request on every single Edit click.
  function handleEditClick(user: User) {
    setModalState({ mode: 'edit', user })
  }

  async function handleFormSubmit(values: UserInput) {
    setIsSubmitting(true)
    try {
      if (modalState?.mode === 'create') {
        await usersApi.create(values)
        notify({ type: 'success', message: 'User created successfully.' })
        setModalState(null)
        // Where a new row lands depends on the current sort/filter/page —
        // the backend puts it first in the default (unsorted) view, so jump
        // back to page 1 to actually show it there. Runs in the background
        // (isLoading only guards the very first load, so this doesn't block
        // the table).
        reloadAfterCreate()
      } else if (modalState?.mode === 'edit') {
        const updated = await usersApi.update(modalState.user.id, values)
        // Reflect the edit immediately from the response we already have...
        patchUserLocally(updated.id, updated)
        notify({ type: 'success', message: 'User updated successfully.' })
        setModalState(null)
        // ...then resync in the background in case the edit moved the row
        // across the active sort/filter/page.
        reload()
      }
    } catch (error) {
      const message =
        error instanceof ApiError ? `Save failed (${error.status}).` : 'Save failed.'
      notify({ type: 'error', message })
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleDeleteConfirm() {
    if (!deleteTarget) return
    const targetId = deleteTarget.id
    const remainingOnPage = users.length - 1
    setIsDeleting(true)
    // Remove it from the table right away instead of waiting on the
    // request/reload round trip.
    removeUserLocally(targetId)
    try {
      await usersApi.remove(targetId)
      notify({ type: 'success', message: 'User deleted.' })
      setDeleteTarget(null)
      reloadAfterDelete(remainingOnPage)
    } catch {
      notify({ type: 'error', message: 'Delete failed. Please try again.' })
      // Undo the optimistic removal by resyncing with the server.
      reload()
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="mx-auto max-w-275 px-4 pt-5 pb-12 sm:px-6 sm:pt-8 sm:pb-16">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Users</h2>
          {currentUser && (
            <p className="mt-1 text-sm text-muted-foreground">Signed in as {currentUser.username}</p>
          )}
        </div>
        <div className="flex gap-3">
          <Button type="button" onClick={() => setModalState({ mode: 'create' })}>
            Add User
          </Button>
          <Button type="button" variant="ghost" onClick={handleLogout}>
            Log out
          </Button>
        </div>
      </header>

      <UsersToolbar
        searchInput={searchInput}
        onSearchInputChange={setSearchInput}
        gender={gender}
        onGenderChange={setGender}
        perPage={perPage}
        onPerPageChange={setPerPage}
      />

      {isLoading && <p className="py-12 text-center text-muted-foreground">Loading users…</p>}

      {!isLoading && loadError && (
        <div className="py-8 text-center text-destructive">
          <p className="mb-3">{loadError}</p>
          <Button type="button" variant="ghost" size="sm" onClick={reload}>
            Retry
          </Button>
        </div>
      )}

      {!isLoading && !loadError && (
        <>
          <UserTable
            users={users}
            editingId={null}
            onEdit={handleEditClick}
            onDelete={setDeleteTarget}
            sortBy={sortBy}
            sortOrder={sortOrder}
            onSort={toggleSort}
            emptyMessage={
              hasActiveFilters
                ? 'No users match your search or filters. Try adjusting them.'
                : 'No users yet. Add your first one.'
            }
          />
          <PaginationControls
            page={page}
            totalPages={totalPages}
            total={total}
            perPage={perPage}
            onPageChange={setPage}
          />
        </>
      )}

      {modalState && (
        <UserFormModal
          mode={modalState.mode}
          initialValues={modalState.mode === 'edit' ? modalState.user : EMPTY_USER}
          isSubmitting={isSubmitting}
          onSubmit={handleFormSubmit}
          onCancel={() => setModalState(null)}
          onNotify={notify}
        />
      )}

      {deleteTarget && (
        <ConfirmDialog
          title="Delete user"
          message={`Are you sure you want to delete "${deleteTarget.firstName} ${deleteTarget.lastName}"? This cannot be undone.`}
          confirmLabel="Delete"
          isBusy={isDeleting}
          onConfirm={handleDeleteConfirm}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  )
}
