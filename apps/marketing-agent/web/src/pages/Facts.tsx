import { useState } from 'react';
import { useApi } from '../lib/useApi.js';
import { api, ApiError } from '../lib/api.js';
import { useToast } from '../lib/toast.js';
import { useAuth } from '../lib/auth.js';
import { Button, Card, Spinner, EmptyState, Field, Input, Badge } from '../components/ui.js';

interface Fact { id: number; factKey: string; value: string; source: string; approvedBy: string; isPublic: boolean; expiresAt: string | null }

export function Facts() {
  const { data, loading, reload } = useApi<{ facts: Fact[] }>('/facts');
  const { user } = useAuth();
  const toast = useToast();
  const [form, setForm] = useState({ factKey: '', value: '', source: '' });
  const [busy, setBusy] = useState(false);

  const create = async () => {
    if (!form.factKey || !form.value || !form.source) return;
    setBusy(true);
    try {
      await api.post('/facts', { ...form, approvedBy: user?.displayName ?? 'Founder', approvalDate: new Date().toISOString(), isPublic: true });
      setForm({ factKey: '', value: '', source: '' });
      toast('Fact approved and added.', 'success');
      await reload();
    } catch (err) {
      toast(err instanceof ApiError ? err.message : 'Failed to add fact.', 'error');
    } finally {
      setBusy(false);
    }
  };

  const retire = async (id: number) => {
    await api.del(`/facts/${id}`);
    await reload();
  };

  return (
    <div className="page container">
      <h1>Marketing facts</h1>
      <p className="muted">Only active, public, approved facts here may be used in generated content — never guessed numbers.</p>
      <Card style={{ margin: '20px 0' }}>
        <div className="card-body">
          <h3>Approve a new fact</h3>
          <div className="row-wrap">
            <Field label="Key">
              <Input value={form.factKey} onChange={(e) => setForm({ ...form, factKey: e.target.value })} placeholder="e.g. pricing.student_cost" style={{ width: 220 }} />
            </Field>
            <Field label="Value">
              <Input value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} style={{ width: 360 }} />
            </Field>
            <Field label="Source">
              <Input value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} style={{ width: 220 }} />
            </Field>
            <Button variant="primary" onClick={() => void create()} loading={busy}>
              Approve fact
            </Button>
          </div>
        </div>
      </Card>

      {loading ? <Spinner /> : !data?.facts.length ? (
        <EmptyState title="No facts approved yet" />
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Key</th>
                <th>Value</th>
                <th>Source</th>
                <th>Approved by</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {data.facts.map((f) => (
                <tr key={f.id}>
                  <td>
                    <code>{f.factKey}</code>
                  </td>
                  <td>{f.value}</td>
                  <td className="muted">{f.source}</td>
                  <td>{f.approvedBy}</td>
                  <td>
                    <Badge variant={f.expiresAt && new Date(f.expiresAt) < new Date() ? 'danger' : 'success'}>
                      {f.expiresAt && new Date(f.expiresAt) < new Date() ? 'retired' : 'active'}
                    </Badge>
                  </td>
                  <td>
                    {!(f.expiresAt && new Date(f.expiresAt) < new Date()) && (
                      <button className="btn btn-sm btn-danger" onClick={() => void retire(f.id)}>
                        Retire
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
