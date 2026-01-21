/**
 * Error Boundary Component
 * Catches JavaScript errors anywhere in the component tree
 * and displays a fallback UI instead of crashing the whole app
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import ErrorService from '../services/errorService';
import { Button } from './ui/button';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  componentName?: string;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorId: string;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorId: this.generateErrorId()
    };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error,
      errorId: 'err-' + Math.random().toString(36).substr(2, 9)
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Log the error to our error service
    ErrorService.report(error, {
      component: this.props.componentName || 'ErrorBoundary',
      action: 'componentDidCatch',
      severity: 'high',
      userId: 'unknown' // Would be set from auth context in real app
    });

    // Call optional onError callback
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('ErrorBoundary caught an error:', error, errorInfo);
    }
  }

  private generateErrorId(): string {
    return 'err-' + Math.random().toString(36).substr(2, 9);
  }

  resetErrorBoundary = () => {
    this.setState({
      hasError: false,
      error: null,
      errorId: this.generateErrorId()
    });
  };

  render() {
    if (this.state.hasError) {
      // You can render any custom fallback UI
      return this.props.fallback || this.renderDefaultFallback();
    }

    return this.props.children;
  }

  private renderDefaultFallback() {
    return (
      <div className="p-4 bg-red-50 border-l-4 border-red-400 rounded-md m-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">
              Something went wrong
            </h3>
            <div className="mt-2 text-sm text-red-700">
              <p>We're sorry, but an unexpected error occurred.</p>
              {process.env.NODE_ENV === 'development' && this.state.error && (
                <div className="mt-2 p-2 bg-gray-100 rounded">
                  <p className="text-xs text-gray-600">Error: {this.state.error.message}</p>
                  <p className="text-xs text-gray-500">ID: {this.state.errorId}</p>
                </div>
              )}
            </div>
            <div className="mt-3">
              <Button
                onClick={this.resetErrorBoundary}
                variant="outline"
                size="sm"
                className="text-red-700 border-red-300 hover:bg-red-50"
              >
                Try again
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }
}

/**
 * Convenience function to wrap a component with ErrorBoundary
 */
export function withErrorBoundary(
  Component: React.ComponentType<any>,
  componentName: string,
  fallback?: ReactNode
) {
  return function WrappedComponent(props: any) {
    return (
      <ErrorBoundary componentName={componentName} fallback={fallback}>
        <Component {...props} />
      </ErrorBoundary>
    );
  };
}

/**
 * Error Boundary for specific components with custom fallback
 */
export function ComponentErrorBoundary({
  children,
  componentName,
  fallback
}: {
  children: ReactNode;
  componentName: string;
  fallback?: ReactNode;
}) {
  return (
    <ErrorBoundary componentName={componentName} fallback={fallback}>
      {children}
    </ErrorBoundary>
  );
}

export default ErrorBoundary;