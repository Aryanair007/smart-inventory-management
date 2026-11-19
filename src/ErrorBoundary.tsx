import { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          fontFamily: 'sans-serif',
          background: '#f7f5fa',
          color: '#16151c'
        }}>
          <div style={{
            maxWidth: '480px',
            width: '100%',
            background: '#fff',
            border: '2px solid #18171e',
            borderRadius: '16px',
            padding: '24px',
            boxShadow: '4px 4px 0 #18171e'
          }}>
            <h2 style={{ margin: '0 0 12px', fontSize: '20px' }}>Something went wrong</h2>
            <p style={{ margin: '0 0 16px', color: '#666', fontSize: '14px' }}>
              {this.state.error?.message || 'An unexpected error occurred while rendering the app.'}
            </p>
            <button
              onClick={() => window.location.reload()}
              style={{
                background: '#ffe044',
                border: '2px solid #18171e',
                borderRadius: '8px',
                padding: '10px 18px',
                fontWeight: 'bold',
                cursor: 'pointer'
              }}
            >
              Reload Application
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
