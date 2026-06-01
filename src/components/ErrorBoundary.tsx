import { Component, ErrorInfo, ReactNode } from 'react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error?: Error
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Tuskr page error:', error, info)
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? (
        <div style={{
          minHeight: '60vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 16,
          padding: '40px 24px',
          textAlign: 'center',
        }}>
          <div style={{
            width: 56,
            height: 56,
            borderRadius: 12,
            background: 'rgba(255,71,87,0.08)',
            border: '1px solid rgba(255,71,87,0.25)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 24,
          }}>
            ✗
          </div>
          <p style={{
            fontFamily: 'var(--f-disp)',
            fontSize: 26,
            fontWeight: 400,
            fontStyle: 'italic',
            color: 'var(--t)',
            opacity: 0.5,
          }}>
            Something went wrong.
          </p>
          <p style={{ fontSize: 13, color: 'var(--t-3)', maxWidth: 340, lineHeight: 1.7 }}>
            {this.state.error?.message ?? 'An unexpected error occurred on this page.'}
          </p>
          <button
            className="btn btn-ghost"
            onClick={() => {
              this.setState({ hasError: false, error: undefined })
              window.location.href = '/'
            }}
          >
            Go back home
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
