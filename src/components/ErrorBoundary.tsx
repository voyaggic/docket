import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  label?: string;
}

interface State {
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  public override state: State = { error: null };

  public static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  public override componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(`[ErrorBoundary${this.props.label ? ` - ${this.props.label}` : ''}] Caught render error:`, error, info);
  }

  public override render(): ReactNode {
    if (this.state.error) {
      return (
        <div className="p-6 m-6 bg-rose-50 border border-rose-200 rounded-2xl text-sm">
          <h3 className="font-bold text-rose-800 mb-2">Something went wrong{this.props.label ? ` in ${this.props.label}` : ''}.</h3>
          <p className="text-rose-600 mb-3">The full error is in the browser console (F12 → Console) — please copy it and report it.</p>
          <pre className="text-xs bg-white border border-rose-200 rounded-lg p-3 overflow-x-auto text-rose-700">
            {this.state.error.message}
          </pre>
          <button
            onClick={() => this.setState({ error: null })}
            className="mt-3 px-4 py-2 bg-rose-600 text-white text-xs font-bold rounded-lg cursor-pointer"
          >
            Try Again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
