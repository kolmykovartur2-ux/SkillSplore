import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api, ApiError } from '../../lib/api.js';
import { useApi } from '../../lib/useApi.js';
import { useToast } from '../../lib/toast.js';
import { Alert, Badge, Button, Card, EmptyState, Field, Input, Modal, Select, Spinner, StatusBadge, Textarea } from '../../components/ui.js';
import { dateStr, deliveryLabel } from '../../lib/format.js';

interface Req {
  id: number; kind: string; title: string; description: string; status: string;
  subject: { name: string }; level: { name: string } | null; deliveryMode: string;
  timing: string | null; responseCount: number; createdAt: string;
}

export function MyRequests() {
  const { data, loading, reload } = useApi<{ requests: Req[] }>('/requests/mine');
  const toast = useToast();
  const [editing, setEditing] = useState<Req | null>(null);

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
                {r.status !== 'CLOSED' && <Button className="btn-sm" onClick={() => setEditing(r)}>Edit</Button>}
                {(r.status === 'DRAFT' || r.status === 'PAUSED') && <Button className="btn-sm" variant="primary" onClick={() => act(r.id, 'publish')}>Publish</Button>}
                {r.status === 'OPEN' && <Button className="btn-sm" onClick={() => act(r.id, 'pause')}>Pause</Button>}
                {r.status !== 'CLOSED' && <Button className="btn-sm" onClick={() => act(r.id, 'close')}>Close</Button>}
              </div>
            </div></Card>
          ))}
        </div>
      )}
      {editing && (
        <EditRequestModal
          request={editing}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); reload(); }}
        />
      )}
    </div>
  );
}

// The API has allowed editing a request since it was written, but nothing ever
// called it, so a typo in a posted request could only be fixed by closing it
// and starting again -- losing any responses already received.
function EditRequestModal({ request, onClose, onSaved }: { request: Req; onClose: () => void; onSaved: () => void }) {
  const toast = useToast();
  const [title, setTitle] = useState(request.title);
  const [description, setDescription] = useState(request.description);
  const [deliveryMode, setDeliveryMode] = useState(request.deliveryMode);
  const [timing, setTiming] = useState(request.timing ?? '');
  const [busy, setBusy] = useState(false);

  const isService = request.kind === 'SERVICE';

  const save = async () => {
    setBusy(true);
    try {
      await api.patch(`/requests/${request.id}`, {
        title: title.trim(),
        description: description.trim(),
        deliveryMode,
        // Sent even when empty: omitting the key would leave the old value in
        // place, so clearing the field in the form would silently do nothing.
        timing: timing.trim(),
      });
      toast('Request updated', 'success');
      onSaved();
    } catch (e) {
      toast(e instanceof ApiError ? e.message : 'Could not save changes', 'error');
    } finally {
      setBusy(false);
    }
  };

  const valid = title.trim().length >= 4 && description.trim().length >= 10;

  return (
    <Modal title="Edit request" onClose={onClose}>
      {request.responseCount > 0 && (
        <Alert type="info">
          {request.responseCount} {request.responseCount === 1 ? 'person has' : 'people have'} already responded. Large changes may make their replies less relevant.
        </Alert>
      )}
      <Field label="Title">
        <Input value={title} onChange={(e) => setTitle(e.target.value)} />
      </Field>
      <Field label={isService ? 'What do you need done?' : 'What do you want to learn?'}>
        <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={5} />
      </Field>
      <Field label="Format">
        <Select value={deliveryMode} onChange={(e) => setDeliveryMode(e.target.value)}>
          <option value="BOTH">Online or in person</option>
          <option value="ONLINE">Online</option>
          <option value="IN_PERSON">In person</option>
        </Select>
      </Field>
      <Field label="Timing (optional)" hint="When you would like this to happen.">
        <Input value={timing} onChange={(e) => setTiming(e.target.value)} placeholder="e.g. Weekday evenings" />
      </Field>
      <div className="row">
        <Button variant="primary" loading={busy} disabled={!valid} onClick={save}>Save changes</Button>
        <Button onClick={onClose}>Cancel</Button>
      </div>
    </Modal>
  );
}
