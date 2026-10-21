import { Edit2, Trash2 } from 'lucide-react'
import type { User } from '../types/user'
import { truncateFileName } from '../utils/fileValidation'
import { Button } from '@/components/ui/button'

interface UserGridViewProps {
  users: User[]
  editingId: string | null
  onEdit: (user: User) => void
  onDelete: (user: User) => void
  emptyMessage: string
}

export function UserGridView({
  users,
  editingId,
  onEdit,
  onDelete,
  emptyMessage,
}: UserGridViewProps) {
  if (users.length === 0) {
    return <p className="py-12 text-center text-muted-foreground">{emptyMessage}</p>
  }

  return (
    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {users.map((user) => (
        <div
          key={user.id}
          className="relative rounded-[10px] border border-border bg-card shadow-sm hover:shadow-md transition-shadow overflow-hidden"
        >
          <div className="absolute right-2 top-2 flex gap-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onEdit(user)}
              disabled={editingId !== null}
              className="h-8 w-8 p-0 hover:bg-muted"
              title="Edit user"
              aria-label={`Edit ${user.firstName} ${user.lastName}`}
            >
              <Edit2 className="size-4 text-muted-foreground hover:text-foreground" aria-hidden="true" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onDelete(user)}
              disabled={editingId !== null}
              className="h-8 w-8 p-0 hover:bg-destructive/10"
              title="Delete user"
              aria-label={`Delete ${user.firstName} ${user.lastName}`}
            >
              <Trash2 className="size-4 text-muted-foreground hover:text-destructive" aria-hidden="true" />
            </Button>
          </div>

          <div className="p-4">
            <div className="mb-4 flex flex-col items-center text-center">
              <div className="mb-3 flex h-16 w-16 items-center justify-center overflow-hidden rounded-full border border-border bg-muted">
                {user.image ? (
                  <img src={user.image} alt={user.firstName} className="block h-full w-full object-cover" />
                ) : (
                  <span className="text-2xl" aria-hidden="true">
                    👤
                  </span>
                )}
              </div>
              <h3 className="font-semibold text-foreground">
                {user.firstName} {user.lastName}
              </h3>
              <p className="text-sm text-muted-foreground">ID: {user.id}</p>
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex flex-col gap-1">
                <span className="font-medium text-muted-foreground">Email</span>
                <p className="break-all text-foreground">{user.email}</p>
              </div>
              <div className="flex flex-col gap-1">
                <span className="font-medium text-muted-foreground">Phone</span>
                <p className="text-foreground">{user.phone}</p>
              </div>
              {user.document && (
                <div className="flex flex-col gap-1">
                  <span className="font-medium text-muted-foreground">Document</span>
                  <a
                    href={user.document.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-[13px] text-primary no-underline hover:underline w-fit"
                    title={user.document.name}
                  >
                    <span aria-hidden="true">📄</span>
                    {truncateFileName(user.document.name)}
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
