import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

// Shared wrapper for the legal documents. Renders a clear "draft — for
// professional review" notice so the placeholders are never mistaken for
// finalised, legally binding policies.
export function LegalLayout({ title, updated, children }: { title: string; updated: string; children: ReactNode }) {
  return (
    <div className="container-narrow" style={{ margin: '0 auto' }}>
      <div className="alert alert-info" style={{ marginBottom: 20 }}>
        <strong>Draft policy.</strong> This document is a placeholder prepared for professional legal
        review. It is not yet a finalised or legally binding agreement.
      </div>
      <article className="card">
        <div className="card-body legal-doc">
          <h1>{title}</h1>
          <p className="muted">Last updated: {updated}</p>
          {children}
          <div className="divider" />
          <p className="muted" style={{ fontSize: '0.9rem' }}>
            Questions about this document? See the other policy:{' '}
            <Link to="/terms">Terms of Service</Link> · <Link to="/privacy">Privacy Policy</Link>.
          </p>
        </div>
      </article>
    </div>
  );
}
