import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props { children: ReactNode }
interface State { error: Error | null }

/**
 * Catches a render-time crash so one broken component does not leave the user
 * staring at a blank white page with no explanation and no way forward.
 *
 * Must be a class component: React has no hook equivalent of
 * componentDidCatch.
 *
 * Note what this deliberately does NOT do: report the error anywhere. There is
 * no error-tracking service configured (see docs/SUBPROCESSORS.md), and adding
 * one silently would put user data in front of a third party nobody has
 * assessed. It logs to the console and tells the user how to report it.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('Unhandled render error:', error, info.componentStack);
  }

  render(): ReactNode {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <div className="container-narrow" style={{ margin: '40px auto' }}>
        <div className="card">
          <div className="card-body">
            <h1>Something went wrong on this page</h1>
            <p className="muted">
              This is a fault on our side, not something you did. Your account and your data are
              unaffected.
            </p>

            <p>
              <button type="button" className="btn btn-primary" onClick={() => window.location.reload()}>
                Reload the page
              </button>{' '}
              <a className="btn btn-outline" href="/">Go to the homepage</a>
            </p>

            <p className="muted" style={{ fontSize: '0.9rem' }}>
              If it keeps happening, please tell us at{' '}
              <a href="mailto:admin@skillsplore.org">admin@skillsplore.org</a> and mention what you
              were doing.
            </p>

            {/* Shown in development only. In production a stack trace tells a
                visitor nothing useful and can leak internal detail. */}
            {import.meta.env.DEV && (
              <pre style={{ overflowX: 'auto', fontSize: '0.8rem', marginTop: 16 }}>
                {error.stack ?? error.message}
              </pre>
            )}
          </div>
        </div>
      </div>
    );
  }
}
