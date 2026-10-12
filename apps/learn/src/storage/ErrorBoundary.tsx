import { Component } from 'react'
import type { ReactNode } from 'react'
import './StorageNotice.css'

export class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  render() {
    if (!this.state.failed) return this.props.children
    return (
      <main className="learn-error-boundary" role="alert">
        <h1>Learn couldn’t open this screen.</h1>
        <p>Reload to try again. If the problem continues, check your browser’s storage settings.</p>
        <button type="button" onClick={() => window.location.reload()}>Reload</button>
      </main>
    )
  }
}
