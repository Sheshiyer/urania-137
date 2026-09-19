import { Component, type ErrorInfo, type ReactNode } from 'react'

interface State {
  error: Error | null
}

/**
 * The last boundary before a white screen. A render failure inside a route
 * becomes an in-shell notice with a reset, and the digest is shown so a
 * report can name it. Never swallows: the error is re-logged to the console.
 */
export class AppErrorBoundary extends Component<{ children: ReactNode; resetKey?: string }, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[urania] route render failed', error, info.componentStack)
  }

  componentDidUpdate(prev: { resetKey?: string }) {
    if (prev.resetKey !== this.props.resetKey && this.state.error) {
      this.setState({ error: null })
    }
  }

  render() {
    const { error } = this.state
    if (!error) return this.props.children
    return (
      <main
        id="main-content"
        data-app-error
        className="grid h-full min-h-[30rem] place-items-center px-6 text-center"
      >
        <div role="alert" className="max-w-md rounded-card border hairline bg-surface/80 px-8 py-8 shadow-popover">
          <p className="font-display text-[9px] uppercase tracking-[0.28em] text-gold">
            The instrument stalled
          </p>
          <h1 className="mt-3 font-serif text-h2 text-parchment">That view did not render.</h1>
          <p className="mt-3 text-small leading-relaxed text-secondary">
            Nothing was written. Return to the map, or reload this view.
          </p>
          <p className="mt-2 font-mono text-meta text-metadata">№ {error.name}: {error.message}</p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <button
              type="button"
              className="btn-primary"
              onClick={() => {
                window.location.hash = '#/'
                this.setState({ error: null })
              }}
            >
              Return to map
            </button>
            <button type="button" className="btn-ghost" onClick={() => this.setState({ error: null })}>
              Try again
            </button>
          </div>
        </div>
      </main>
    )
  }
}
