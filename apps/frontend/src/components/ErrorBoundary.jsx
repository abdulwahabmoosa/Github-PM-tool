import { Component } from 'react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[ErrorBoundary] Caught:', error);
    console.error('[ErrorBoundary] Info:', errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-5">
          <div className="max-w-md text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-6 shadow-sm">
            <div className="text-3xl mb-2">⚠</div>
            <h1 className="text-lg font-medium text-slate-900 dark:text-slate-50 mb-2">
              Something went wrong
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-5">
              The page encountered an unexpected error. You can try reloading
              or go back to the dashboard.
            </p>
            {this.state.error?.message && (
              <details className="text-left mb-4">
                <summary className="text-xs text-slate-500 dark:text-slate-400 cursor-pointer mb-1">
                  Technical details
                </summary>
                <code className="block text-[10px] text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 p-2 rounded font-mono overflow-x-auto">
                  {this.state.error.message}
                </code>
              </details>
            )}
            <div className="flex gap-2 justify-center">
              <button
                onClick={this.handleReload}
                className="bg-slate-900 dark:bg-slate-50 text-white dark:text-slate-900 hover:bg-slate-700 dark:hover:bg-slate-200 px-3.5 py-2 text-sm font-medium rounded-md transition-colors"
              >
                Reload page
              </button>
              <a
                href="/dashboard"
                className="bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 px-3 py-2 text-sm font-medium rounded-md transition-colors"
              >
                Go to dashboard
              </a>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
