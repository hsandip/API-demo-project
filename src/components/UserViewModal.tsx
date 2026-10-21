import type { User } from '../types/user'
import { truncateFileName } from '../utils/fileValidation'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface UserViewModalProps {
  user: User | null
  onClose: () => void
}

export function UserViewModal({ user, onClose }: UserViewModalProps) {
  if (!user) return null

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        showCloseButton={false}
        aria-label="User details"
        onPointerDownOutside={(event) => event.preventDefault()}
        onInteractOutside={(event) => event.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>User Details</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Photo */}
          <div className="flex justify-center">
            <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border border-border bg-muted">
              {user.image ? (
                <img src={user.image} alt="" className="block h-full w-full object-cover" />
              ) : (
                <span className="text-3xl" aria-hidden="true">
                  👤
                </span>
              )}
            </div>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase">ID</p>
              <p className="text-sm font-medium text-foreground">{user.id}</p>
            </div>

            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase">First Name</p>
              <p className="text-sm font-medium text-foreground">{user.firstName}</p>
            </div>

            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase">Last Name</p>
              <p className="text-sm font-medium text-foreground">{user.lastName}</p>
            </div>

            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase">Email</p>
              <p className="text-sm font-medium text-foreground break-all">{user.email}</p>
            </div>

            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase">Phone</p>
              <p className="text-sm font-medium text-foreground">{user.phone}</p>
            </div>

            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase">Document</p>
              {user.document ? (
                <a
                  href={user.document.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-primary no-underline hover:underline"
                  title={user.document.name}
                >
                  <span aria-hidden="true">📄</span>
                  {truncateFileName(user.document.name)}
                </a>
              ) : (
                <p className="text-sm text-muted-foreground">—</p>
              )}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
