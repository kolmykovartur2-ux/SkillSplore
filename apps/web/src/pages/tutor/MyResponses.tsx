import { Link } from 'react-router-dom';
import { useApi } from '../../lib/useApi.js';
import type { Money, PublicUser } from '../../lib/types.js';
import { Badge, Card, EmptyState, Spinner, StatusBadge } from '../../components/ui.js';
import { dateStr, money } from '../../lib/format.js';

interface MyResponse {
  id: number; status: string; introduction: string; proposedRate: Money | null;
  availabilityNote: string | null; createdAt: string;
  request: { id: number; kind: string; title: string; status: string; subject: { id: number; name: string }; hidden: boolean };
  learner: PublicUser;
}

/**
 * Responses previously only existed inside the request feed, which shows OPEN
 * requests only, so a provider lost sight of their own reply as soon as the
 * learner paused or closed the request.
 */
export function MyResponses() {
  const { data, loading } = useApi<{ responses: MyResponse[] }>('/responses/mine');

  if (loading) return <Spinner />;
  const responses = data?.responses ?? [];

  return (
    <div className="stack">
      <div className="section-title">
        <h1 className="mt-0">My responses</h1>
        <Link className="btn" to="/tutor/feed">Find requests</Link>
      </div>
      {responses.length === 0 ? (
        <EmptyState emoji="✉️" title="You haven't responded to anything yet">
          Replies you send to matching requests will show up here, including after the request closes.
        </EmptyState>
      ) : (
        <div className="stack-sm">
          {responses.map((r) => (
            <Card key={r.id}><div className="card-body">
              <div className="spread">
                <div>
                  {/* A closed or hidden request has no detail page the provider
                      can still open, so only link when it is actually reachable. */}
                  {r.request.status === 'OPEN' && !r.request.hidden
                    ? <Link to={`/requests/${r.request.id}`}><strong>{r.request.title}</strong></Link>
                    : <strong>{r.request.title}</strong>}
                  <div className="row-wrap" style={{ marginTop: 6 }}>
                    <Badge>{r.request.kind === 'LEARNING' ? 'Learning' : 'Service'}</Badge>
                    <Badge>{r.request.subject.name}</Badge>
                    <span className="muted" style={{ fontSize: '0.82rem' }}>
                      for {r.learner.displayName} · sent {dateStr(r.createdAt)}
                    </span>
                  </div>
                </div>
                <div className="center">
                  <StatusBadge status={r.status} />
                  {r.proposedRate && <div className="muted" style={{ fontSize: '0.8rem', marginTop: 4 }}>{money(r.proposedRate)}/hr</div>}
                </div>
              </div>

              <p style={{ whiteSpace: 'pre-wrap', marginTop: 10, marginBottom: 0 }}>{r.introduction}</p>
              {r.availabilityNote && <p className="muted" style={{ fontSize: '0.86rem', marginBottom: 0 }}>Availability: {r.availabilityNote}</p>}

              {r.request.hidden ? (
                <p className="muted" style={{ fontSize: '0.82rem', marginBottom: 0 }}>This request was removed by moderation.</p>
              ) : r.request.status !== 'OPEN' && (
                <p className="muted" style={{ fontSize: '0.82rem', marginBottom: 0 }}>
                  This request is now {r.request.status.toLowerCase()}, so it no longer appears in matching requests.
                </p>
              )}
            </div></Card>
          ))}
        </div>
      )}
    </div>
  );
}
