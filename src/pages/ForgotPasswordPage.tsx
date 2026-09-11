import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { authApi } from '../services/auth.service'
import { ApiError } from '../lib/axios'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function ForgotPasswordPage() {
  const [identifier, setIdentifier] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [devResetLink, setDevResetLink] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()

    if (!identifier.trim()) {
      setError('Enter your username or email.')
      return
    }

    setError('')
    setDevResetLink(null)
    setIsSubmitting(true)
    try {
      const result = await authApi.requestPasswordReset(identifier.trim())
      toast.success('If an account exists for that username or email, reset instructions are on the way.')
      if (result) setDevResetLink(result.resetLink)
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-svh items-center justify-center p-5">
      <form
        className="w-full max-w-90 rounded-xl border border-border bg-card p-8 shadow-lg"
        onSubmit={handleSubmit}
      >
        <h1 className="mb-2 text-2xl font-semibold text-foreground">Forgot password</h1>
        <p className="mb-6 text-sm text-muted-foreground">
          Enter your username or email and we'll send you a link to reset your password. Try{' '}
          <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-sm text-foreground">emilys</code>.
        </p>

        <Label className="mb-4 flex flex-col items-stretch gap-1.5">
          <span className="text-sm font-medium text-foreground">Username or email</span>
          <Input
            value={identifier}
            onChange={(event) => setIdentifier(event.target.value)}
            autoComplete="username"
            placeholder="emilys"
          />
        </Label>

        {error && <p className="mb-4 text-[13px] text-destructive">{error}</p>}

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? 'Sending…' : 'Send reset link'}
        </Button>

        {devResetLink && (
          <div className="mt-4 rounded-md border border-border bg-muted p-3 text-[13px]">
            <p className="mb-1 font-medium text-foreground">Development preview</p>
            <p className="mb-2 text-muted-foreground">
              No email server is configured in this demo, so here's the link that would have been emailed:
            </p>
            <Link to={devResetLink} className="break-all font-mono text-primary underline underline-offset-4">
              {devResetLink}
            </Link>
          </div>
        )}

        <p className="mt-6 text-center text-sm text-muted-foreground">
          <Button asChild variant="link" size="sm" className="h-auto p-0">
            <Link to="/login">Back to sign in</Link>
          </Button>
        </p>
      </form>
    </div>
  )
}
