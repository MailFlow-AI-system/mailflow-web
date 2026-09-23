import { Component, type ErrorInfo, type ReactNode } from 'react'

import { captureBrowserError } from './faro'

type BrowserErrorBoundaryProps = {
  children: ReactNode
}

type BrowserErrorBoundaryState = {
  hasError: boolean
}

export class BrowserErrorBoundary extends Component<
  BrowserErrorBoundaryProps,
  BrowserErrorBoundaryState
> {
  state: BrowserErrorBoundaryState = { hasError: false }

  static getDerivedStateFromError(): BrowserErrorBoundaryState {
    return { hasError: true }
  }

  componentDidCatch(error: unknown, _errorInfo: ErrorInfo): void {
    captureBrowserError(error)
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children
    }

    return (
      <section role="alert" aria-live="assertive">
        <h1>Something went wrong</h1>
        <p>Reload the page or try again.</p>
        <button type="button" onClick={() => this.setState({ hasError: false })}>
          Try again
        </button>
      </section>
    )
  }
}
