import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';
import { Button } from './ui/button';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  fallbackMessage?: string;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary] Caught error:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    this.props.onReset?.();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-full min-h-[200px] p-6 text-center">
          <div className="w-14 h-14 rounded-2xl bg-destructive/10 flex items-center justify-center mb-4">
            <AlertTriangle className="w-7 h-7 text-destructive" />
          </div>
          <h3 className="text-base font-semibold mb-1">
            {this.props.fallbackTitle || 'Something went wrong'}
          </h3>
          <p className="text-sm text-muted-foreground mb-4 max-w-sm">
            {this.props.fallbackMessage ||
              'An unexpected error occurred. Try refreshing or resetting this component.'}
          </p>
          {this.state.error && (
            <pre className="text-xs text-destructive/70 bg-destructive/5 rounded-lg p-3 mb-4 max-w-md overflow-auto max-h-24">
              {this.state.error.message}
            </pre>
          )}
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={this.handleReset}>
              <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
              Try Again
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => window.location.reload()}
            >
              Reload Page
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
