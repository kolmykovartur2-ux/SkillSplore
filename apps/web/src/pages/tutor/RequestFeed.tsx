import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useApi } from '../../lib/useApi.js';
import type { PageMeta, PublicUser } from '../../lib/types.js';
import { Badge, Card, EmptyState, Select, Spinner, StatusBadge } from '../../components/ui.js';
import { dateStr, deliveryLabel } from '../../lib/format.js';

interface FeedItem { id: number; kind: string; title: string; description: string; deliveryMode: string; city: string | null; country: string | null; subject: { name: string }; level: { name: string } | null; createdAt: string; student: PublicUser; myResponse: { id: number; status: string } | null }
interface Subject { id: number; name: string }

export function RequestFeed() {
  const { data: subs } = useApi<{ subjects: Subject[] }>('/taxonomy/subjects');
  const [filters, setFilters] = useState({ kind: '', subjectId: '', mode: '', page: 1 });

  const path = useMemo(() => {
    const p = new URLSearchParams();
    if (filters.kind) p.set('kind', filters.kind);
    if (filters.subjectId) p.set('subjectId', filters.subjectId);
    if (filters.mode) p.set('mode', filters.mode);
    p.set('page', String(filters.page));
    return `/requests/feed?${p.toString()}`;
  }, [filters]);

  const { data, loading, error } = useApi<{ results: FeedItem[]; meta: PageMeta }>(path);

  if (error) return <EmptyState emoji="🔒" title="Approved profiles only">Your teaching profile must be approved to see matching requests.</EmptyState>;

  return (
    <div className="stack">
      <h1>Matching requests</h1>
      <p className="muted">Open requests that match your subjects or skills. You can submit one tailored response per request.</p>
      <div className="row-wrap">
        <Select value={filters.kind} onChange={(e) => setFilters({ ...filters, kind: e.target.value, page: 1 })} style={{ width: 'auto' }}>
          <option value="">All types</option><option value="LEARNING">Learning requests</option><option value="SERVICE">Service requests</option>
        </Select>
        <Select value={filters.subjectId} onChange={(e) => setFilters({ ...filters, subjectId: e.target.value, page: 1 })} style={{ width: 'auto' }}>
          <option value="">My subjects</option>
          {subs?.subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </Select>
        <Select value={filters.mode} onChange={(e) => setFilters({ ...filters, mode: e.target.value, page: 1 })} style={{ width: 'auto' }}>
          <option value="">Any format</option><option value="online">Online</option><option value="in_person">In person</option>
        </Select>
      </div>

      {loading ? <Spinner /> : (data?.results.length ?? 0) === 0 ? (
        <EmptyState emoji="📭" title="No matching requests right now">Check back later or broaden your subjects.</EmptyState>
      ) : (
        <div className="stack-sm">
          {data!.results.map((r) => (
            <Card key={r.id}><div className="card-body">
              <div className="spread">
                <Link to={`/requests/${r.id}`}><strong>{r.title}</strong></Link>
                {r.myResponse ? <StatusBadge status={r.myResponse.status} /> : <Badge variant="primary">New</Badge>}
              </div>
              <div className="row-wrap" style={{ marginTop: 6 }}>
                <Badge>{r.kind === 'LEARNING' ? 'Learning' : 'Service'}</Badge><Badge>{r.subject.name}</Badge>{r.level && <Badge>{r.level.name}</Badge>}
                <span className="muted" style={{ fontSize: '0.82rem' }}>{deliveryLabel(r.deliveryMode)}{r.city ? ` · ${r.city}` : ''} · {dateStr(r.createdAt)}</span>
              </div>
              <p className="muted" style={{ marginTop: 8, marginBottom: 8 }}>{r.description.slice(0, 160)}{r.description.length > 160 ? '…' : ''}</p>
              <Link className="btn btn-sm btn-primary" to={`/requests/${r.id}`}>{r.myResponse ? 'View / edit response' : 'Respond'}</Link>
            </div></Card>
          ))}
        </div>
      )}
    </div>
  );
}
