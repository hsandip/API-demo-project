import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../features/auth/useAuth'
import { usersApi } from '../services/user.service'
import { ApiError } from '../lib/axios'
import type { User, UserInput } from '../types/user'
import { UserTable } from '../components/UserTable'
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

  const [users, setUsers] = useState<User[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState('')

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

  useEffect(() => {
    const controller = new AbortController()
    loadUsers(controller.signal)
    return () => controller.abort()
  }, [])

  async function loadUsers(signal?: AbortSignal) {
    setIsLoading(true)
    setLoadError('')
    try {
      const data = await usersApi.list(signal)
      setUsers(data.users)
    } catch {
      // A signal aborted by our own effect cleanup (e.g. React StrictMode's
      // double-invoke in dev, or a real unmount) isn't a real failure —
      // checking the signal directly is more reliable here than trying to
      // detect a "cancel" error type through the ApiError wrapper.
      if (signal?.aborted) return
      setLoadError('Failed to load users. Please try again.')
    } finally {
      if (!signal?.aborted) setIsLoading(false)
    }
  }

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
        const created = await usersApi.create(values)
        setUsers((prev) => [created, ...prev])
        notify({ type: 'success', message: 'User created successfully.' })
      } else if (modalState?.mode === 'edit') {
        const id = modalState.user.id
        const saved = await usersApi.update(id, values)
        setUsers((prev) => prev.map((u) => (u.id === id ? saved : u)))
        notify({ type: 'success', message: 'User updated successfully.' })
      }
      setModalState(null)
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
      setUsers((prev) => prev.filter((u) => u.id !== deleteTarget.id))
      notify({ type: 'success', message: 'User deleted.' })
      setDeleteTarget(null)
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

      {isLoading && <p className="py-12 text-center text-muted-foreground">Loading users…</p>}

      {!isLoading && loadError && (
        <div className="py-8 text-center text-destructive">
          <p className="mb-3">{loadError}</p>
          <Button type="button" variant="ghost" size="sm" onClick={() => loadUsers()}>
            Retry
          </Button>
        </div>
      )}

      {!isLoading && !loadError && (
        <UserTable
          users={users}
          editingId={editingId}
          onEdit={handleEditClick}
          onDelete={setDeleteTarget}
        />
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
