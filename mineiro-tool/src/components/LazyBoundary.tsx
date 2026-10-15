import { Component, Suspense, type ReactNode } from 'react';

interface State { failed: boolean }

/**
 * Keeps a failed lazy chunk (flaky proxy, stale cache after a redeploy) from blanking the whole app:
 * shows a small inline notice with a reload button instead.
 */
class ChunkErrorBoundary extends Component<{ children: ReactNode; label?: string }, State> {
  state: State = { failed: false };
  static getDerivedStateFromError(): State { return { failed: true }; }
  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div role="alert" className="mx-auto my-6 max-w-xl rounded-xl border border-[#343a40] bg-[#101316] p-4 text-sm text-[#c5cad0]">
        Could not load {this.props.label || 'this part'} of the interface.{' '}
        <button type="button" className="underline hover:text-white" onClick={() => window.location.reload()}>Reload</button>
      </div>
    );
  }
}

export function LazyBoundary({ children, label, fallback = null }: { children: ReactNode; label?: string; fallback?: ReactNode }) {
  return (
    <ChunkErrorBoundary label={label}>
      <Suspense fallback={fallback}>{children}</Suspense>
    </ChunkErrorBoundary>
  );
}
