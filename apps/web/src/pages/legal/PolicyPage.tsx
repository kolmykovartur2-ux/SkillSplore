import { Link } from 'react-router-dom';
import { useApi } from '../../lib/useApi.js';
import { Alert } from '../../components/ui.js';
import { renderMarkdown } from '../../lib/markdown.js';

interface PolicyDoc {
  slug: string;
  title: string;
  path: string;
  body: string;
  version: string | null;
  isPublished: boolean;
  isLegallyReviewed: boolean;
  effectiveAt: string | null;
  unresolvedPlaceholders: string[];
  placeholderOccurrences: number;
}

/**
 * Renders any of the policy documents from the API.
 *
 * The banner logic is the point of this component. A document that has not
 * been through legal review, or that still contains fill-in-the-blank
 * placeholders, is labelled as a draft in a way the reader cannot miss.
 * Presenting an unreviewed draft as a live policy would be worse than having
 * no policy page at all -- it invites reliance on something nobody has
 * checked.
 */
export function PolicyPage({ path }: { path: string }) {
  const { data, loading, error } = useApi<PolicyDoc>(`/legal/documents/${path}`);

  if (loading) return <div className="container-narrow" style={{ margin: '0 auto' }}><p className="muted">Loading…</p></div>;
  if (error || !data) {
    return (
      <div className="container-narrow" style={{ margin: '0 auto' }}>
        <Alert type="error">This policy could not be loaded.</Alert>
      </div>
    );
  }

  const isDraft = !data.isPublished || !data.isLegallyReviewed || data.unresolvedPlaceholders.length > 0;

  return (
    <div className="container-narrow" style={{ margin: '0 auto' }}>
      {isDraft && (
        <div className="alert alert-warning" style={{ marginBottom: 20 }}>
          <strong>Draft — not yet in force.</strong> This document has been prepared for review by a
          qualified lawyer and is not a finalised or legally binding agreement.
          {data.unresolvedPlaceholders.length > 0 && (
            <>
              {' '}It still contains {data.placeholderOccurrences} placeholder
              {data.placeholderOccurrences === 1 ? '' : 's'} covering{' '}
              {data.unresolvedPlaceholders.length} detail
              {data.unresolvedPlaceholders.length === 1 ? '' : 's'} that must be filled in before
              launch.
            </>
          )}
        </div>
      )}

      <article className="card">
        <div className="card-body legal-doc">
          <div dangerouslySetInnerHTML={{ __html: renderMarkdown(data.body) }} />

          <div className="divider" />
          <p className="muted" style={{ fontSize: '0.9rem' }}>
            {data.version && <>Version {data.version}. </>}
            Other policies:{' '}
            <Link to="/terms">Terms</Link> · <Link to="/privacy">Privacy</Link> ·{' '}
            <Link to="/community-guidelines">Community Guidelines</Link> ·{' '}
            <Link to="/safety">Safety</Link> · <Link to="/academic-integrity">Academic Integrity</Link> ·{' '}
            <Link to="/prohibited-services">Prohibited Services</Link> ·{' '}
            <Link to="/cookies">Cookies</Link> · <Link to="/subprocessors">Subprocessors</Link>
          </p>
        </div>
      </article>
    </div>
  );
}
