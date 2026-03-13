import React from 'react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[ErrorBoundary]', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[300px] p-8 text-center">
          <div className="text-danger text-lg font-medium mb-2">页面渲染出错</div>
          <pre className="text-xs text-text-tertiary bg-surface-hover rounded-md p-4 max-w-lg overflow-auto whitespace-pre-wrap">
            {this.state.error?.message || String(this.state.error)}
          </pre>
          <button
            className="mt-4 px-4 py-2 rounded-md bg-accent text-white text-sm hover:bg-accent-hover transition-colors"
            onClick={() => this.setState({ hasError: false, error: null })}
          >
            重试
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
