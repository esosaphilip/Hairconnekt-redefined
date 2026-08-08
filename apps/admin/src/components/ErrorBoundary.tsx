import { Component, type ReactNode } from 'react';
import './error-boundary.css';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  errorName: string;
  errorMessage: string;
  errorStack: string;
  eventId: string;
}

declare global {
  interface Window {
    Sentry?: {
      captureException: (error: Error, ctx?: Record<string, unknown>) => string;
    };
  }
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      errorName: '',
      errorMessage: '',
      errorStack: '',
      eventId: '',
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      errorName: error.name || 'UnknownError',
      errorMessage: error.message || 'No error message',
      errorStack: error.stack || '',
    };
  }

  componentDidCatch(error: Error): void {
    let eventId = '';
    try {
      if (typeof window !== 'undefined' && typeof window.Sentry?.captureException === 'function') {
        eventId = window.Sentry.captureException(error) || '';
      }
    } catch {
      // Sentry may be unavailable; swallow
    }

    if (eventId) {
      this.setState((s) => ({ ...s, eventId }));
    }

    console.error('[ErrorBoundary] Uncaught error:', error);
  }

  private handleReload = (): void => {
    if (typeof window === 'undefined') return;
    window.location.reload();
  };

  private handleGoHome = (): void => {
    if (typeof window === 'undefined') return;
    window.location.replace('/');
  };

  render(): ReactNode {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <div className="hc-eb-root" role="alert" aria-live="assertive">
        <div className="hc-eb-card">
          <div className="hc-eb-emoji" aria-hidden="true">⚠️</div>
          <h1 className="hc-eb-title">Ein Fehler ist aufgetreten</h1>
          <p className="hc-eb-subtitle">
            Die Admin-Oberfläche hat einen unerwarteten Zustand erreicht. Bitte lade die Seite neu.
            Sollte das Problem bestehen, kontaktiere das Entwicklerteam.
          </p>

          <div className="hc-eb-actions">
            <button
              type="button"
              onClick={this.handleReload}
              className="btn btn-primary hc-eb-btn"
              autoFocus
            >
              Seite neu laden
            </button>
            <button
              type="button"
              onClick={this.handleGoHome}
              className="btn btn-outline hc-eb-btn"
            >
              Zum Start
            </button>
          </div>

          <details className="hc-eb-details">
            <summary>Technische Details (nur Entwickler)</summary>
            <div className="hc-eb-details-body">
              <div className="hc-eb-kv">
                <span className="hc-eb-k">Error</span>
                <span className="hc-eb-v">{this.state.errorName}</span>
              </div>
              <div className="hc-eb-kv">
                <span className="hc-eb-k">Message</span>
                <span className="hc-eb-v">{this.state.errorMessage}</span>
              </div>
              {this.state.eventId ? (
                <div className="hc-eb-kv">
                  <span className="hc-eb-k">Sentry Event</span>
                  <span className="hc-eb-v">{this.state.eventId}</span>
                </div>
              ) : null}
              {this.state.errorStack ? (
                <pre className="hc-eb-stack" aria-hidden={false}>
                  {this.state.errorStack}
                </pre>
              ) : null}
            </div>
          </details>
        </div>
      </div>
    );
  }
}
