import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'

interface ErrorPageProps {
  code?: string | number
  title: string
  message: string
  onRetry?: () => void
  showHomeLink?: boolean
}

export function ErrorPage({ code, title, message, onRetry, showHomeLink }: ErrorPageProps) {
  return (
    <div className="px-6 py-8 text-center">
      {code !== undefined && (
        <p className="mb-2 text-[15px] font-semibold tracking-wide text-destructive">{code}</p>
      )}
      <h1 className="mb-2 text-[22px] font-semibold text-foreground">{title}</h1>
      <p className="mb-5 text-sm text-muted-foreground">{message}</p>
      <div className="flex justify-center gap-3">
        {onRetry && (
          <Button type="button" onClick={onRetry}>
            Try again
          </Button>
        )}
        {showHomeLink && (
          <Button asChild variant="ghost">
            <Link to="/dashboard">Back to dashboard</Link>
          </Button>
        )}
      </div>
    </div>
  )
}
