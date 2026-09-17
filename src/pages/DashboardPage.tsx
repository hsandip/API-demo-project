import { useRef, useState } from 'react'
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
  } = useUsers()

  const [modalState, setModalState] = useState<ModalState>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  const [deleteTarget, setDeleteTarget] = useState<User | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  function notify(data: ToastData) {
    if (data.type === 'success') sonnerToast.success(data.message)
    else sonnerToast.error(data.message)
  }

  const editRequestIdRef = useRef(0)

  function handleLogout() {
    logout()
    navigate('/login', { replace: true })
  }

  async function handleEditClick(user: User) {
    // Guards against a stale response winning if a second Edit click fires
    // before the first request resolves (UserTable also disables every Edit
    // button while one is in flight, so this is a belt-and-suspenders check).
    const requestId = ++editRequestIdRef.current
    setEditingId(user.id)
    try {
      const fresh = await usersApi.getById(user.id)
      if (editRequestIdRef.current !== requestId) return
      setModalState({ mode: 'edit', user: fresh })
    } catch {
      if (editRequestIdRef.current !== requestId) return
      notify({ type: 'error', message: 'Failed to load the latest user data.' })
    } finally {
      if (editRequestIdRef.current === requestId) setEditingId(null)
    }
  }

  async function handleFormSubmit(values: UserInput) {
    setIsSubmitting(true)
    try {
      if (modalState?.mode === 'create') {
        await usersApi.create(values)
        notify({ type: 'success', message: 'User created successfully.' })
      } else if (modalState?.mode === 'edit') {
        await usersApi.update(modalState.user.id, values)
        notify({ type: 'success', message: 'User updated successfully.' })
      }
      setModalState(null)
      reload()
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
    setIsDeleting(true)
    try {
      await usersApi.remove(deleteTarget.id)
      notify({ type: 'success', message: 'User deleted.' })
      const remainingOnPage = users.length - 1
      setDeleteTarget(null)
      reloadAfterDelete(remainingOnPage)
    } catch {
      notify({ type: 'error', message: 'Delete failed. Please try again.' })
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
            editingId={editingId}
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
