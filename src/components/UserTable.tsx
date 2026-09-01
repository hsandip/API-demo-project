import type { User } from '../types/user'
import { truncateFileName } from '../utils/fileValidation'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

interface UserTableProps {
  users: User[]
  editingId: string | null
  onEdit: (user: User) => void
  onDelete: (user: User) => void
}

export function UserTable({ users, editingId, onEdit, onDelete }: UserTableProps) {
  if (users.length === 0) {
    return <p className="py-12 text-center text-muted-foreground">No users yet. Add your first one.</p>
  }

  return (
    <div className="overflow-x-auto rounded-[10px] border border-border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Photo</TableHead>
            <TableHead>ID</TableHead>
            <TableHead>First Name</TableHead>
            <TableHead>Last Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Phone</TableHead>
            <TableHead>Document</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((user) => (
            <TableRow key={user.id}>
              <TableCell>
                <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border border-border bg-muted">
                  {user.image ? (
                    <img src={user.image} alt="" className="block h-full w-full object-cover" />
                  ) : (
                    <span className="text-base" aria-hidden="true">
                      👤
                    </span>
                  )}
                </div>
              </TableCell>
              <TableCell>{user.id}</TableCell>
              <TableCell>{user.firstName}</TableCell>
              <TableCell>{user.lastName}</TableCell>
              <TableCell>{user.email}</TableCell>
              <TableCell>{user.phone}</TableCell>
              <TableCell>
                {user.document ? (
                  <a
                    href={user.document.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-[13px] text-primary no-underline hover:underline"
                    title={user.document.name}
                  >
                    <span aria-hidden="true">📄</span>
                    {truncateFileName(user.document.name)}
                  </a>
                ) : (
                  <span className="text-muted-foreground" aria-hidden="true">
                    —
                  </span>
                )}
              </TableCell>
              <TableCell className="text-right space-x-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => onEdit(user)}
                  disabled={editingId !== null}
                >
                  {editingId === user.id ? 'Loading…' : 'Edit'}
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={() => onDelete(user)}
                  disabled={editingId !== null}
                >
                  Delete
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
