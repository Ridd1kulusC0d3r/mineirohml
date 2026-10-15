import { Component, type ReactNode } from 'react';
import { reportClientError } from '../utils/clientLog';

/** Last line of defense: show the error instead of an empty dark page, and send it to the server log. */
export class RootErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  componentDidCatch(error: Error) { reportClientError('render', error); }
  render() {
    const { error } = this.state;
    if (!error) return this.props.children;
    return (
      <div role="alert" style={{ padding: 24, maxWidth: 820, margin: '40px auto', color: '#f2f0eb', fontFamily: 'ui-monospace, monospace' }}>
        <h1 style={{ fontSize: 18, marginBottom: 8 }}>Mineiro hit an unexpected error</h1>
        <pre style={{ whiteSpace: 'pre-wrap', fontSize: 12, color: '#a3a9b0' }}>{String(error.stack || error.message).slice(0, 1500)}</pre>
        <button type="button" onClick={() => window.location.reload()} style={{ marginTop: 12, padding: '8px 14px', border: '1px solid #4a5159', borderRadius: 8, background: 'transparent', color: 'inherit' }}>Reload</button>
      </div>
    );
  }
}
