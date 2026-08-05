import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api, ApiError } from '../../lib/api.js';
import { useApi } from '../../lib/useApi.js';
import { AdminNav } from '../../components/AdminNav.js';
import { Alert, Badge, Button, EmptyState, Select, Spinner, StatusBadge, Textarea } from '../../components/ui.js';
import { dateStr } from '../../lib/format.js';
import { useToast } from '../../lib/toast.js';

interface FeedbackItem {
  id: number;
  kind: string;
  status: string;
  message: string;
  email: string | null;
  pageUrl: string | null;
  userAgent: string | null;
  adminNote: string | null;
  createdAt: string;
  user: { id: number; displayName: string } | null;
}

const KIND_LABELS: Record<string, string> = {
  BUG: 'Bug',
  SUGGESTION: 'Suggestion',
  COMPLAINT: 'Complaint',
  PRAISE: 'Praise',
  QUESTION: 'Question',
  OTHER: 'Other',
};

/**
 * Queue for the in-product feedback widget.
 *
 * Without this the widget writes to a table nobody opens, which is worse than
 * having no widget: it invites people to report problems and then quietly
 * discards them.
 */
export function AdminFeedback() {
  const [params, setParams] = useSearchParams();
  const status = params.get('status') ?? '';
  const { data, loading, reload } = useApi<{ feedback: FeedbackItem[]; counts: { new: number } }>(
    `/feedback${status ? `?status=${status}` : ''}`,
  );
  const toast = useToast();
  const [busyId, setBusyId] = useState<number | null>(null);
  const [notes, setNotes] = useState<Record<number, string>>({});
  const [error, setError] = useState<string | null>(null);

  const update = async (item: FeedbackItem, nextStatus: string) => {
    setBusyId(item.id); setError(null);
    try {
      await api.patch(`/feedback/${item.id}`, {
        status: nextStatus,
        adminNote: notes[item.id] ?? undefined,
      });
      toast('Updated.', 'success');
      reload();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not update that.');
    } finally { setBusyId(null); }
  };

  return (
    <div>
      <AdminNav />
      <div className="section-title">
        <h1 className="mt-0">
          Feedback{data && data.counts.new > 0 && <> <Badge>{data.counts.new} new</Badge></>}
        </h1>
        <Select
          value={status}
          onChange={(e) => setParams(e.target.value ? { status: e.target.value } : {})}
          style={{ width: 'auto' }}
        >
          <option value="">All</option>
          <option value="NEW">New</option>
          <option value="TRIAGED">Triaged</option>
          <option value="ACTIONED">Actioned</option>
          <option value="CLOSED">Closed</option>
        </Select>
      </div>

      {error && <Alert type="error">{error}</Alert>}

      {loading ? <Spinner /> : (data?.feedback.length ?? 0) === 0 ? (
        <EmptyState emoji="💬" title="No feedback yet" />
      ) : (
        <div className="stack">
          {data!.feedback.map((f) => (
            <div key={f.id} className="card">
              <div className="card-body">
                <div className="spread" style={{ gap: 12, alignItems: 'baseline' }}>
                  <div className="row-wrap" style={{ gap: 8 }}>
                    <Badge>{KIND_LABELS[f.kind] ?? f.kind}</Badge>
                    <StatusBadge status={f.status} />
                  </div>
                  <span className="muted" style={{ fontSize: '0.85rem' }}>{dateStr(f.createdAt)}</span>
                </div>

                <p style={{ whiteSpace: 'pre-wrap', marginTop: 10 }}>{f.message}</p>

                <p className="muted" style={{ fontSize: '0.85rem' }}>
                  {f.user ? <>From <strong>{f.user.displayName}</strong></> : 'From a signed-out visitor'}
                  {/* No email means we literally cannot reply -- worth being
                      obvious about, so nobody waits for a response to land. */}
                  {f.email ? <> · <a href={`mailto:${f.email}`}>{f.email}</a></> : <> · <em>no reply address</em></>}
                  {f.pageUrl && <> · on <code>{f.pageUrl}</code></>}
                </p>

                <Textarea
                  rows={2}
                  placeholder="Internal note (optional)"
                  value={notes[f.id] ?? f.adminNote ?? ''}
                  onChange={(e) => setNotes({ ...notes, [f.id]: e.target.value })}
                />

                <div className="row-wrap" style={{ gap: 8, marginTop: 8 }}>
                  <Button className="btn-sm" loading={busyId === f.id} onClick={() => update(f, 'TRIAGED')}>Triaged</Button>
                  <Button className="btn-sm" variant="primary" loading={busyId === f.id} onClick={() => update(f, 'ACTIONED')}>Actioned</Button>
                  <Button className="btn-sm" variant="ghost" loading={busyId === f.id} onClick={() => update(f, 'CLOSED')}>Close</Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
