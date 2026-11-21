import { Component, type ReactNode } from 'react';
import { exportJson } from '../lib/storage';
import { getState } from '../lib/store';

interface State { error: Error | null }

/** Last line of defence: never lose data because of a rendering bug. */
export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  download = () => {
    const blob = new Blob([exportJson(getState())], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'lifeos-backup.json';
    a.click();
    URL.revokeObjectURL(a.href);
  };

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="page" style={{ maxWidth: 520, paddingTop: '15vh' }}>
        <h1 className="page-title">Något gick fel</h1>
        <p className="muted" style={{ margin: '8px 0 20px' }}>Din data är kvar i webbläsaren. Ladda om sidan, eller ladda ner en säkerhetskopia först.</p>
        <div className="row">
          <button className="btn btn-primary" onClick={() => window.location.reload()}>Ladda om</button>
          <button className="btn" onClick={this.download}>Ladda ner säkerhetskopia</button>
        </div>
      </div>
    );
  }
}
