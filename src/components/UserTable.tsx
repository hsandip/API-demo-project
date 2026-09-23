import { ChevronDown, ChevronUp, ChevronsUpDown } from 'lucide-react'
import type { User, UserSortField, SortOrder } from '../types/user'
import { SORTABLE_COLUMNS } from '../constants/users'
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
  sortBy: UserSortField | null
  sortOrder: SortOrder | null
  onSort: (field: UserSortField) => void
  emptyMessage: string
}

function SortableHead({
  field,
  label,
  sortBy,
  sortOrder,
  onSort,
}: {
  field: UserSortField
  label: string
  sortBy: UserSortField | null
  sortOrder: SortOrder | null
  onSort: (field: UserSortField) => void
}) {
  const isActive = sortBy === field
  const Icon = isActive ? (sortOrder === 'asc' ? ChevronUp : ChevronDown) : ChevronsUpDown

  return (
    <TableHead>
      <button
        type="button"
        onClick={() => onSort(field)}
        className="inline-flex cursor-pointer items-center gap-1 border-0 bg-transparent p-0 font-medium text-foreground"
        aria-label={`Sort by ${label}`}
      >
        {label}
        <Icon className="size-3.5 text-muted-foreground" aria-hidden="true" />
      </button>
    </TableHead>
  )
}

export function UserTable({
  users,
  editingId,
  onEdit,
  onDelete,
  sortBy,
  sortOrder,
  onSort,
  emptyMessage,
}: UserTableProps) {
  if (users.length === 0) {
    return <p className="py-12 text-center text-muted-foreground">{emptyMessage}</p>
  }

  return (
    <div className="overflow-x-auto rounded-[10px] border border-border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Photo</TableHead>
            <TableHead>ID</TableHead>
            {SORTABLE_COLUMNS.map((column) => (
              <SortableHead
                key={column.field}
                field={column.field}
                label={column.label}
                sortBy={sortBy}
                sortOrder={sortOrder}
                onSort={onSort}
              />
            ))}
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
