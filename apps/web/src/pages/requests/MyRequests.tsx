import { Link } from 'react-router-dom';
import { api, ApiError } from '../../lib/api.js';
import { useApi } from '../../lib/useApi.js';
import { useToast } from '../../lib/toast.js';
import { Badge, Button, Card, EmptyState, Spinner, StatusBadge } from '../../components/ui.js';
import { dateStr, deliveryLabel } from '../../lib/format.js';

interface Req { id: number; kind: string; title: string; status: string; subject: { name: string }; level: { name: string } | null; deliveryMode: string; responseCount: number; createdAt: string }

export function MyRequests() {
  const { data, loading, reload } = useApi<{ requests: Req[] }>('/requests/mine');
  const toast = useToast();

  const act = async (id: number, action: 'publish' | 'pause' | 'close') => {
    try { await api.post(`/requests/${id}/${action}`); toast('Updated', 'success'); reload(); }
    catch (e) { toast(e instanceof ApiError ? e.message : 'Failed', 'error'); }
  };

  if (loading) return <Spinner />;
  const requests = data?.requests ?? [];

  return (
    <div className="stack">
      <div className="section-title"><h1 className="mt-0">My requests</h1><Link className="btn btn-primary" to="/requests/new">Post a request</Link></div>
      {requests.length === 0 ? (
        <EmptyState emoji="📝" title="No requests yet">Post a request and let suitable people come to you.</EmptyState>
      ) : (
        <div className="stack-sm">
          {requests.map((r) => (
            <Card key={r.id}><div className="card-body">
              <div className="spread">
                <div>
                  <Link to={`/requests/${r.id}`}><strong>{r.title}</strong></Link>
                  <div className="row-wrap" style={{ marginTop: 6 }}>
                    <Badge>{r.kind === 'LEARNING' ? 'Learning' : 'Service'}</Badge><Badge>{r.subject.name}</Badge>{r.level && <Badge>{r.level.name}</Badge>}
                    <span className="muted" style={{ fontSize: '0.82rem' }}>{deliveryLabel(r.deliveryMode)} · {dateStr(r.createdAt)}</span>
                  </div>
                </div>
                <div className="center"><StatusBadge status={r.status} /><div className="muted" style={{ fontSize: '0.8rem', marginTop: 4 }}>{r.responseCount} response(s)</div></div>
              </div>
              <div className="row-wrap" style={{ marginTop: 12 }}>
                <Link className="btn btn-sm" to={`/requests/${r.id}`}>View {r.responseCount > 0 ? 'responses' : ''}</Link>
                {(r.status === 'DRAFT' || r.status === 'PAUSED') && <Button className="btn-sm" variant="primary" onClick={() => act(r.id, 'publish')}>Publish</Button>}
                {r.status === 'OPEN' && <Button className="btn-sm" onClick={() => act(r.id, 'pause')}>Pause</Button>}
                {r.status !== 'CLOSED' && <Button className="btn-sm" onClick={() => act(r.id, 'close')}>Close</Button>}
              </div>
            </div></Card>
          ))}
        </div>
      )}
    </div>
  );
}
