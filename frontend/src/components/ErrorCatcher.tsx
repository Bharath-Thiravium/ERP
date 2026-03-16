import React from 'react';

interface ErrorCatcherProps {
  children: React.ReactNode;
  name: string;
}

class ErrorCatcher extends React.Component<ErrorCatcherProps, { hasError: boolean; error?: Error }> {
  constructor(props: ErrorCatcherProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error(`🚨 ErrorCatcher [${this.props.name}] caught error:`, error);
    console.error(`🚨 ErrorCatcher [${this.props.name}] error info:`, errorInfo);
    console.error(`🚨 ErrorCatcher [${this.props.name}] component stack:`, errorInfo.componentStack);
    
    // Also log to a global error handler
    if (window.console && window.console.error) {
      window.console.error('REACT ERROR BOUNDARY:', {
        component: this.props.name,
        error: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack
      });
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-4 bg-red-100 border border-red-400 rounded">
          <h3 className="font-bold text-red-800">Error in {this.props.name}</h3>
          <p className="text-red-700">{this.state.error?.message}</p>
          <pre className="text-xs text-red-600 mt-2 overflow-auto">
            {this.state.error?.stack}
          </pre>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorCatcher;