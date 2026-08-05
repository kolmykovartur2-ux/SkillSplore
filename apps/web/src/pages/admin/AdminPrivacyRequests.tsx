import { useState } from 'react';
import { api, ApiError } from '../../lib/api.js';
import { useApi } from '../../lib/useApi.js';
import { AdminNav } from '../../components/AdminNav.js';
import { Alert, Badge, Button, EmptyState, Select, Spinner, StatusBadge, Textarea } from '../../components/ui.js';
import { dateStr } from '../../lib/format.js';
import { useToast } from '../../lib/toast.js';

interface PrivacyRequestItem {
  id: number;
  type: string;
  status: string;
  contactEmail: string;
  details: string;
  identityCheckNote: string | null;
  outcomeNote: string | null;
  refusalReason: string | null;
  createdAt: string;
  closedAt: string | null;
}

const TYPE_LABELS: Record<string, string> = {
  ACCESS: 'Access',
  CORRECTION: 'Correction',
  EXPORT: 'Export',
  DEACTIVATION: 'Deactivate',
  DELETION: 'Deletion',
  MARKETING_OPT_OUT: 'Marketing opt-out',
  CONSENT_WITHDRAWAL: 'Withdraw consent',
  COMPLAINT: 'Complaint',
  AUTOMATED_DECISION_ENQUIRY: 'Automated decision',
};

const OPEN_STATUSES = ['RECEIVED', 'IDENTITY_CHECK', 'IN_PROGRESS', 'AWAITING_USER'];

/**
 * Queue for privacy requests.
 *
 * These carry legal response obligations, so a request sitting unread in a
 * table is a compliance problem rather than merely a missed message. Open
 * requests are counted in the heading for that reason.
 */
export function AdminPrivacyRequests() {
  const { data, loading, reload } = useApi<{ requests: PrivacyRequestItem[] }>('/privacy-requests');
  const toast = useToast();
  const [busyId, setBusyId] = useState<number | null>(null);
  const [drafts, setDrafts] = useState<Record<number, { note: string; status: string }>>({});
  const [error, setError] = useState<string | null>(null);

  const openCount = (data?.requests ?? []).filter((r) => OPEN_STATUSES.includes(r.status)).length;

  const update = async (item: PrivacyRequestItem) => {
    const draft = drafts[item.id];
    if (!draft?.status) return;
    setBusyId(item.id); setError(null);
    try {
      await api.patch(`/privacy-requests/${item.id}`, {
        status: draft.status,
        // Refusals must record a reason: the requester has to be told why, and
        // a regulator may later ask to see it.
        ...(draft.status === 'REFUSED'
          ? { refusalReason: draft.note || 'No reason recorded.' }
          : { outcomeNote: draft.note || undefined }),
        note: draft.note || undefined,
      });
      toast('Request updated.', 'success');
      reload();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not update that request.');
    } finally { setBusyId(null); }
  };

  return (
    <div>
      <AdminNav />
      <div className="section-title">
        <h1 className="mt-0">
          Privacy requests{openCount > 0 && <> <Badge>{openCount} open</Badge></>}
        </h1>
      </div>

      <Alert type="info">
        These carry legal obligations. Verify identity <strong>proportionately</strong> — never ask
        for identity documents to action a simple marketing opt-out. See
        <code> docs/USER_DATA_REQUESTS.md</code>.
      </Alert>

      {error && <Alert type="error">{error}</Alert>}

      {loading ? <Spinner /> : (data?.requests.length ?? 0) === 0 ? (
        <EmptyState emoji="🗂️" title="No privacy requests" />
      ) : (
        <div className="stack">
          {data!.requests.map((r) => (
            <div key={r.id} className="card">
              <div className="card-body">
                <div className="spread" style={{ gap: 12, alignItems: 'baseline' }}>
                  <div className="row-wrap" style={{ gap: 8 }}>
                    <Badge>{TYPE_LABELS[r.type] ?? r.type}</Badge>
                    <StatusBadge status={r.status} />
                  </div>
                  <span className="muted" style={{ fontSize: '0.85rem' }}>{dateStr(r.createdAt)}</span>
                </div>

                <p style={{ whiteSpace: 'pre-wrap', marginTop: 10 }}>{r.details}</p>

                <p className="muted" style={{ fontSize: '0.85rem' }}>
                  Reply to <a href={`mailto:${r.contactEmail}`}>{r.contactEmail}</a>
                  {r.closedAt && <> · closed {dateStr(r.closedAt)}</>}
                </p>

                {r.identityCheckNote && (
                  <p className="muted" style={{ fontSize: '0.85rem' }}>
                    <strong>Identity check:</strong> {r.identityCheckNote}
                  </p>
                )}
                {r.outcomeNote && <p className="muted"><strong>Outcome:</strong> {r.outcomeNote}</p>}
                {r.refusalReason && <p className="muted"><strong>Refused:</strong> {r.refusalReason}</p>}

                <Textarea
                  rows={2}
                  placeholder="Note — what you did, or why you refused"
                  value={drafts[r.id]?.note ?? ''}
                  onChange={(e) => setDrafts({ ...drafts, [r.id]: { note: e.target.value, status: drafts[r.id]?.status ?? '' } })}
                />

                <div className="row-wrap" style={{ gap: 8, marginTop: 8 }}>
                  <Select
                    value={drafts[r.id]?.status ?? ''}
                    onChange={(e) => setDrafts({ ...drafts, [r.id]: { note: drafts[r.id]?.note ?? '', status: e.target.value } })}
                    style={{ width: 'auto' }}
                  >
                    <option value="">Set status…</option>
                    <option value="IDENTITY_CHECK">Identity check</option>
                    <option value="IN_PROGRESS">In progress</option>
                    <option value="AWAITING_USER">Awaiting user</option>
                    <option value="COMPLETED">Completed</option>
                    <option value="REFUSED">Refused</option>
                    <option value="WITHDRAWN">Withdrawn</option>
                  </Select>
                  <Button
                    className="btn-sm"
                    variant="primary"
                    disabled={!drafts[r.id]?.status}
                    loading={busyId === r.id}
                    onClick={() => update(r)}
                  >
                    Save
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
