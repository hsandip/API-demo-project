import { ErrorPage } from '../components/ErrorPage'

export function NotFoundPage() {
  return (
    <div className="flex min-h-svh items-center justify-center p-5">
      <ErrorPage
        code={404}
        title="Page not found"
        message="The page you're looking for doesn't exist or may have been moved."
        showHomeLink
      />
    </div>
  )
}
