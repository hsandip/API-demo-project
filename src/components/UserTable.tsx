import { ChevronDown, ChevronUp, ChevronsUpDown } from 'lucide-react'
import type { User, UserSortField, SortOrder, UserInput } from '../types/user'
import { SORTABLE_COLUMNS } from '../constants/users'
import { truncateFileName } from '../utils/fileValidation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

type ColumnKey = 'photo' | 'id' | 'firstName' | 'lastName' | 'email' | 'phone' | 'document' | 'actions'

interface UserTableProps {
  users: User[]
  editingId: string | null
  onEdit: (user: User) => void
  onDelete: (user: User) => void
  onView: (user: User) => void
  sortBy: UserSortField | null
  sortOrder: SortOrder | null
  onSort: (field: UserSortField) => void
  inlineEditingId: string | null
  inlineEditingValues: UserInput | null
  onInlineEditChange: <K extends keyof UserInput>(field: K, value: UserInput[K]) => void
  onInlineEditSave: (userId: string) => void
  onInlineEditCancel: () => void
  isSubmitting: boolean
  emptyMessage: string
  hiddenColumns: Set<ColumnKey>
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
  onEdit,
  onDelete,
  onView,
  sortBy,
  sortOrder,
  onSort,
  inlineEditingId,
  inlineEditingValues,
  onInlineEditChange,
  onInlineEditSave,
  onInlineEditCancel,
  isSubmitting,
  emptyMessage,
  hiddenColumns,
}: UserTableProps) {
  if (users.length === 0) {
    return <p className="py-12 text-center text-muted-foreground">{emptyMessage}</p>
  }

  return (
    <div className="overflow-x-auto rounded-[10px] border border-border">
      <Table>
        <TableHeader>
          <TableRow>
            {!hiddenColumns.has('photo') && <TableHead>Photo</TableHead>}
            {!hiddenColumns.has('id') && <TableHead>ID</TableHead>}
            {SORTABLE_COLUMNS.map((column) => {
              const columnKey = column.field as ColumnKey
              if (hiddenColumns.has(columnKey)) return null
              return (
                <SortableHead
                  key={column.field}
                  field={column.field}
                  label={column.label}
                  sortBy={sortBy}
                  sortOrder={sortOrder}
                  onSort={onSort}
                />
              )
            })}
            {!hiddenColumns.has('phone') && <TableHead>Phone</TableHead>}
            {!hiddenColumns.has('document') && <TableHead>Document</TableHead>}
            {!hiddenColumns.has('actions') && <TableHead className="text-right">Actions</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((user) => {
            const isEditing = inlineEditingId === user.id

            return (
              <TableRow key={user.id} className={isEditing ? 'bg-muted/50' : ''}>
                {!hiddenColumns.has('photo') && (
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
                )}
                {!hiddenColumns.has('id') && <TableCell>{user.id}</TableCell>}
                {!hiddenColumns.has('firstName') && (
                  <TableCell
                    onClick={() => !isEditing && onEdit(user)}
                    className={isEditing ? '' : 'cursor-pointer hover:bg-muted/50'}
                  >
                    {isEditing ? (
                      <Input
                        type="text"
                        value={inlineEditingValues?.firstName || ''}
                        onChange={(e) => onInlineEditChange('firstName', e.target.value)}
                        disabled={isSubmitting}
                        className="h-8 text-sm"
                        autoFocus
                      />
                    ) : (
                      user.firstName
                    )}
                  </TableCell>
                )}
                {!hiddenColumns.has('lastName') && (
                  <TableCell
                    onClick={() => !isEditing && onEdit(user)}
                    className={isEditing ? '' : 'cursor-pointer hover:bg-muted/50'}
                  >
                    {isEditing ? (
                      <Input
                        type="text"
                        value={inlineEditingValues?.lastName || ''}
                        onChange={(e) => onInlineEditChange('lastName', e.target.value)}
                        disabled={isSubmitting}
                        className="h-8 text-sm"
                      />
                    ) : (
                      user.lastName
                    )}
                  </TableCell>
                )}
                {!hiddenColumns.has('email') && (
                  <TableCell
                    onClick={() => !isEditing && onEdit(user)}
                    className={isEditing ? '' : 'cursor-pointer hover:bg-muted/50'}
                  >
                    {isEditing ? (
                      <Input
                        type="email"
                        value={inlineEditingValues?.email || ''}
                        onChange={(e) => onInlineEditChange('email', e.target.value)}
                        disabled={isSubmitting}
                        className="h-8 text-sm"
                      />
                    ) : (
                      user.email
                    )}
                  </TableCell>
                )}
                {!hiddenColumns.has('phone') && (
                  <TableCell
                    onClick={() => !isEditing && onEdit(user)}
                    className={isEditing ? '' : 'cursor-pointer hover:bg-muted/50'}
                  >
                    {isEditing ? (
                      <Input
                        type="tel"
                        value={inlineEditingValues?.phone || ''}
                        onChange={(e) => onInlineEditChange('phone', e.target.value)}
                        disabled={isSubmitting}
                        className="h-8 text-sm"
                      />
                    ) : (
                      user.phone
                    )}
                  </TableCell>
                )}
                {!hiddenColumns.has('document') && (
                  <TableCell>
                    {user.document ? (
                      <a
                        href={user.document.url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 text-[13px] text-primary no-underline hover:underline"
                        title={user.document.name}
                        onClick={(e) => isEditing && e.preventDefault()}
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
                )}
                {!hiddenColumns.has('actions') && (
                  <TableCell className="text-right space-x-2">
                    {isEditing ? (
                      <>
                        <Button
                          type="button"
                          variant="default"
                          size="sm"
                          onClick={() => onInlineEditSave(user.id)}
                          disabled={isSubmitting}
                        >
                          Save
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={onInlineEditCancel}
                          disabled={isSubmitting}
                        >
                          Cancel
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => onView(user)}
                        >
                          View
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => onEdit(user)}
                        >
                          Edit
                        </Button>
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          onClick={() => onDelete(user)}
                        >
                          Delete
                        </Button>
                      </>
                    )}
                  </TableCell>
                )}
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}
