import { useState } from 'react'
import type { FormEvent } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../features/auth/useAuth'
import { ApiError } from '../lib/axios'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function LoginPage() {
  const { isAuthenticated, login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (isAuthenticated) {
    const redirectTo = (location.state as { from?: string } | null)?.from ?? '/dashboard'
    return <Navigate to={redirectTo} replace />
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()

    if (!username || !password) {
      setError('Username and password are required.')
      return
    }

    setError('')
    setIsSubmitting(true)
    try {
      await login(username, password)
      navigate('/dashboard', { replace: true })
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Login failed. Please try again.')
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
        <h1 className="mb-2 text-2xl font-semibold text-foreground">Sign in</h1>
        <p className="mb-6 text-sm text-muted-foreground">
          Try DummyJSON's demo user:{' '}
          <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-sm text-foreground">
            emilys
          </code>{' '}
          /{' '}
          <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-sm text-foreground">
            emilyspass
          </code>
        </p>

        <Label className="mb-4 flex flex-col items-stretch gap-1.5">
          <span className="text-sm font-medium text-foreground">Username</span>
          <Input
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            autoComplete="username"
            placeholder="emilys"
          />
        </Label>

        <Label className="mb-4 flex flex-col items-stretch gap-1.5">
          <span className="text-sm font-medium text-foreground">Password</span>
          <Input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
            placeholder="••••••••"
          />
        </Label>

        {error && <p className="mb-4 text-[13px] text-destructive">{error}</p>}

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? 'Signing in…' : 'Log in'}
        </Button>
      </form>
    </div>
  )
}
