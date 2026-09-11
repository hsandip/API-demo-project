import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { authApi } from '../services/auth.service'
import { ApiError } from '../lib/axios'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const MIN_PASSWORD_LENGTH = 8

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const token = searchParams.get('token') ?? ''

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  function validate(): string {
    if (!token) return 'This reset link is invalid or incomplete. Please request a new one.'
    if (password.length < MIN_PASSWORD_LENGTH) {
      return `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`
    }
    if (password !== confirmPassword) return 'Passwords do not match.'
    return ''
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()

    const validationError = validate()
    setError(validationError)
    if (validationError) return

    setIsSubmitting(true)
    try {
      await authApi.resetPassword(token, password)
      toast.success('Your password has been reset. Please sign in.')
      navigate('/login', { replace: true })
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to reset password. Please try again.')
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
        <h1 className="mb-2 text-2xl font-semibold text-foreground">Reset password</h1>
        <p className="mb-6 text-sm text-muted-foreground">Choose a new password for your account.</p>

        <Label className="mb-4 flex flex-col items-stretch gap-1.5">
          <span className="text-sm font-medium text-foreground">New password</span>
          <Input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="new-password"
            placeholder="••••••••"
          />
        </Label>

        <Label className="mb-4 flex flex-col items-stretch gap-1.5">
          <span className="text-sm font-medium text-foreground">Confirm new password</span>
          <Input
            type="password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            autoComplete="new-password"
            placeholder="••••••••"
          />
        </Label>

        {error && <p className="mb-4 text-[13px] text-destructive">{error}</p>}

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? 'Resetting…' : 'Reset password'}
        </Button>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          <Button asChild variant="link" size="sm" className="h-auto p-0">
            <Link to="/login">Back to sign in</Link>
          </Button>
        </p>
      </form>
    </div>
  )
}
