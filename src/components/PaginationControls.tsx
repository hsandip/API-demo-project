import { Button } from '@/components/ui/button'

interface PaginationControlsProps {
  page: number
  totalPages: number
  total: number
  perPage: number
  onPageChange: (page: number) => void
}

export function PaginationControls({
  page,
  totalPages,
  total,
  perPage,
  onPageChange,
}: PaginationControlsProps) {
  if (total === 0) return null

  const rangeStart = (page - 1) * perPage + 1
  const rangeEnd = Math.min(page * perPage, total)

  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
      <p className="m-0 text-sm text-muted-foreground">
        Showing {rangeStart}–{rangeEnd} of {total} users
      </p>
      <div className="flex items-center gap-3">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
        >
          Previous
        </Button>
        <span className="text-sm text-muted-foreground">
          Page {page} of {totalPages}
        </span>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
        >
          Next
        </Button>
      </div>
    </div>
  )
}
