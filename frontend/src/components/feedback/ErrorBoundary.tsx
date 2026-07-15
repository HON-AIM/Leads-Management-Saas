import { Component, type ErrorInfo, type ReactNode } from 'react'
import { Button } from '@/components/ui/button'

interface Props {
  children: ReactNode
  fallback?: ReactNode
  componentName?: string
}

interface State {
  hasError: boolean
  error?: Error
  errorInfo?: ErrorInfo
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary]', error, errorInfo)
    this.setState({ errorInfo })
  }

  private getFormattedErrorDetails(): string {
    const { error, errorInfo } = this.state
    const componentName = this.props.componentName || 'Unknown'
    const timestamp = new Date().toISOString()

    let details = `Error Report\n`
    details += `================\n`
    details += `Component: ${componentName}\n`
    details += `Time: ${timestamp}\n`
    details += `Message: ${error?.message || 'Unknown error'}\n`
    if (error?.stack) {
      details += `\nStack Trace:\n${error.stack}\n`
    }
    if (errorInfo?.componentStack) {
      details += `\nComponent Stack:\n${errorInfo.componentStack}\n`
    }
    return details
  }

  private handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(this.getFormattedErrorDetails())
    } catch {
      const textarea = document.createElement('textarea')
      textarea.value = this.getFormattedErrorDetails()
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
    }
  }

  private handleTryAgain = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined })
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <div className="flex min-h-[400px] w-full flex-col items-center justify-center gap-5 rounded-xl border border-white/[0.08] bg-[#0e1428] p-8">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-500/10">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-500">
                <circle cx="12" cy="12" r="10" /><line x1="12" x2="12" y1="8" y2="12" /><line x1="12" x2="12.01" y1="16" y2="16" />
              </svg>
            </div>
            <div className="text-center max-w-lg">
              <h2 className="text-[16px] font-semibold text-white">
                Something went wrong
                {this.props.componentName && (
                  <span className="ml-2 text-[13px] font-normal text-muted-foreground">
                    in {this.props.componentName}
                  </span>
                )}
              </h2>
              <p className="mt-2 text-[13px] text-red-400/90 font-mono break-all">
                {this.state.error?.message || 'An unexpected error occurred'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={this.handleTryAgain}>
                Try Again
              </Button>
              <Button variant="outline" size="sm" onClick={this.handleCopy}>
                Copy Error Details
              </Button>
            </div>
          </div>
        )
      )
    }

    return this.props.children
  }
}
