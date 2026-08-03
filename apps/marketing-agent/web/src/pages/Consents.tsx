import { useState } from 'react';
import { useApi } from '../lib/useApi.js';
import { api, ApiError } from '../lib/api.js';
import { useToast } from '../lib/toast.js';
import { Button, Card, Spinner, EmptyState, Field, Input, Badge, Textarea } from '../components/ui.js';

interface Consent { id: number; subjectDescription: string; scope: string; withdrawnAt: string | null; evidenceReference: string }

export function Consents() {
  const { data, loading, reload } = useApi<{ consents: Consent[] }>('/consents');
  const toast = useToast();
  const [form, setForm] = useState({ subjectDescription: '', scope: '', evidenceReference: '' });
  const [busy, setBusy] = useState(false);

  const create = async () => {
    if (!form.subjectDescription || !form.scope || !form.evidenceReference) return;
    setBusy(true);
    try {
      await api.post('/consents', form);
      setForm({ subjectDescription: '', scope: '', evidenceReference: '' });
      toast('Consent recorded.', 'success');
      await reload();
    } catch (err) {
      toast(err instanceof ApiError ? err.message : 'Failed to record consent.', 'error');
    } finally {
      setBusy(false);
    }
  };

  const withdraw = async (id: number) => {
    const res = await api.post<{ affectedPublished: { id: number }[] }>(`/consents/${id}/withdraw`);
    if (res.affectedPublished.length > 0) {
      toast(`Withdrawn. ${res.affectedPublished.length} published post(s) using this material are flagged for review.`, 'error');
    } else {
      toast('Withdrawn.', 'success');
    }
    await reload();
  };

  return (
    <div className="page container">
      <h1>Consents</h1>
      <p className="muted">Required before publishing any identifiable customer/tutor name, photo, screenshot with personal data, or testimonial (§14).</p>
      <Card style={{ margin: '20px 0' }}>
        <div className="card-body stack">
          <h3>Record a consent</h3>
          <Field label="Subject description (no need to store more PII than necessary)">
            <Input value={form.subjectDescription} onChange={(e) => setForm({ ...form, subjectDescription: e.target.value })} />
          </Field>
          <Field label="Scope (what was agreed)">
            <Textarea value={form.scope} onChange={(e) => setForm({ ...form, scope: e.target.value })} />
          </Field>
          <Field label="Evidence reference (e.g. link to signed form / email)">
            <Input value={form.evidenceReference} onChange={(e) => setForm({ ...form, evidenceReference: e.target.value })} />
          </Field>
          <Button variant="primary" onClick={() => void create()} loading={busy}>
            Record consent
          </Button>
        </div>
      </Card>

      {loading ? <Spinner /> : !data?.consents.length ? (
        <EmptyState title="No consents recorded" />
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Subject</th>
                <th>Scope</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {data.consents.map((c) => (
                <tr key={c.id}>
                  <td>{c.subjectDescription}</td>
                  <td className="muted">{c.scope}</td>
                  <td>
                    <Badge variant={c.withdrawnAt ? 'danger' : 'success'}>{c.withdrawnAt ? 'withdrawn' : 'active'}</Badge>
                  </td>
                  <td>
                    {!c.withdrawnAt && (
                      <button className="btn btn-sm btn-danger" onClick={() => void withdraw(c.id)}>
                        Withdraw
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
