import React from 'react';
import { RotateCcw } from 'lucide-react';
import { safeRemoveStorage } from '../lib/storage';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  storageKey?: string;
  onReset?: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  autoResetCount: number;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, autoResetCount: 0 };
  }

  static getDerivedStateFromError(): Partial<ErrorBoundaryState> {
    return { hasError: true };
  }

  componentDidCatch(): void {
    if (this.props.storageKey) {
      safeRemoveStorage(this.props.storageKey);
    }
    // Attempt automatic recovery once without user intervention
    if (this.state.autoResetCount === 0) {
      this.setState((prev) => ({
        hasError: false,
        autoResetCount: prev.autoResetCount + 1,
      }));
      this.props.onReset?.();
    }
  }

  handleManualReset = () => {
    if (this.props.storageKey) {
      safeRemoveStorage(this.props.storageKey);
    }
    this.props.onReset?.();
    this.setState({ hasError: false, autoResetCount: 0 });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="rounded-2xl border border-[#E2E8F0] dark:border-slate-800 bg-white dark:bg-[#111827] p-8 text-center">
          <h2 className="text-lg font-semibold text-[#0F172A] dark:text-[#F8FAFC]">
            Something went wrong in this tool
          </h2>
          <p className="mt-2 text-base text-slate-600 dark:text-slate-400">
            Saved data was cleared to restore stability. Click below to reload a clean workspace.
          </p>
          <button
            type="button"
            onClick={this.handleManualReset}
            className="mt-5 inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-[#059669] px-5 py-2.5 text-base font-medium text-white transition hover:bg-[#047857] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#059669]"
          >
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            <span>Auto-Reset Tool</span>
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
