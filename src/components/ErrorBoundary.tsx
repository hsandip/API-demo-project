import { Component } from 'react'
import type { ErrorInfo, ReactNode } from 'react'
import { ErrorPage } from './ErrorPage'

interface ErrorBoundaryProps {
  children: ReactNode
}

interface ErrorBoundaryState {
  error: Error | null
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Unhandled error caught by ErrorBoundary:', error, info.componentStack)
  }

  handleRetry = () => {
    this.setState({ error: null })
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex min-h-svh items-center justify-center p-5">
          <ErrorPage
            title="Something went wrong"
            message="An unexpected error occurred. You can try again, or reload the page."
            onRetry={this.handleRetry}
          />
        </div>
      )
    }

    return this.props.children
  }
}
