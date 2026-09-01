import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

interface ConfirmDialogProps {
  title: string
  message: string
  confirmLabel?: string
  isBusy?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({
  title,
  message,
  confirmLabel = 'Confirm',
  isBusy = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <AlertDialog open onOpenChange={(open) => !open && onCancel()}>
      <AlertDialogContent size="sm">
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{message}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isBusy}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={isBusy}
            onClick={(event) => {
              // Delete is async — keep the dialog open (with the disabled
              // "Deleting…" state) until DashboardPage's handleDeleteConfirm
              // finishes and unmounts us, instead of Radix's default
              // close-immediately-on-click behavior.
              event.preventDefault()
              onConfirm()
            }}
          >
            {isBusy ? 'Deleting…' : confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
