import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api, ApiError } from '../../lib/api.js';
import { useApi } from '../../lib/useApi.js';
import { useToast } from '../../lib/toast.js';
import { AdminNav } from '../../components/AdminNav.js';
import { Button, Card, Field, Select, Spinner, StatusBadge, Textarea } from '../../components/ui.js';
import { dateTime } from '../../lib/format.js';

interface Report { id: number; entityType: string; entityId: number; reason: string; details: string | null; status: string; resolutionNote: string | null; createdAt: string; reporter: { displayName: string } }
interface Note { id: number; body: string; createdAt: string }

export function ReportDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { data, loading, reload } = useApi<{ report: Report; context: Record<string, unknown> | null; notes: Note[] }>(`/admin/reports/${id}`);
  const [action, setAction] = useState<'investigate' | 'dismiss' | 'resolve'>('resolve');
  const [note, setNote] = useState('');
  const [hide, setHide] = useState(false);
  const [busy, setBusy] = useState(false);

  if (loading) return <><AdminNav /><Spinner /></>;
  const r = data!.report;

  const resolve = async () => {
    setBusy(true);
    try {
      await api.post(`/admin/reports/${r.id}/resolve`, { action, note: note || undefined, hideContent: hide });
      toast('Report updated', 'success');
      reload();
    } catch (e) { toast(e instanceof ApiError ? e.message : 'Failed', 'error'); }
    finally { setBusy(false); }
  };

  return (
    <div>
      <AdminNav />
      <div className="spread"><h1 className="mt-0">Report #{r.id}</h1><StatusBadge status={r.status} /></div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 20, alignItems: 'start' }} className="profile-layout">
        <div className="stack">
          <Card><div className="card-body">
            <p><strong>Type:</strong> {r.entityType.replace('_', ' ')} #{r.entityId}</p>
            <p><strong>Reason:</strong> {r.reason}</p>
            {r.details && <p><strong>Details:</strong> {r.details}</p>}
            <p className="muted">Reported by {r.reporter.displayName} on {dateTime(r.createdAt)}</p>
          </div></Card>
          <Card><div className="card-body">
            <h3 className="mt-0">Reported content</h3>
            <pre style={{ whiteSpace: 'pre-wrap', background: 'var(--surface-2)', padding: 12, borderRadius: 8, fontSize: '0.82rem', overflowX: 'auto' }}>
              {data!.context ? JSON.stringify(data!.context, null, 2) : 'Content not found (it may have been removed).'}
            </pre>
          </div></Card>
          {data!.notes.length > 0 && (
            <Card><div className="card-body"><h3 className="mt-0">Moderation notes</h3>
              <ul className="list-reset stack-sm">{data!.notes.map((n) => <li key={n.id} className="alert alert-info" style={{ margin: 0 }}>{n.body}</li>)}</ul>
            </div></Card>
          )}
        </div>
        <aside>
          <Card><div className="card-body stack">
            <h3 className="mt-0">Take action</h3>
            <Field label="Decision">
              <Select value={action} onChange={(e) => setAction(e.target.value as typeof action)}>
                <option value="investigate">Mark investigating</option>
                <option value="resolve">Resolve</option>
                <option value="dismiss">Dismiss</option>
              </Select>
            </Field>
            <label className="check"><input type="checkbox" checked={hide} onChange={(e) => setHide(e.target.checked)} /><span>Hide the reported content</span></label>
            <Field label="Resolution note"><Textarea value={note} onChange={(e) => setNote(e.target.value)} /></Field>
            <Button variant="primary" className="btn-block" loading={busy} onClick={resolve}>Apply</Button>
            <Button className="btn-block" onClick={() => navigate('/admin/reports')}>Back to reports</Button>
          </div></Card>
        </aside>
      </div>
    </div>
  );
}
