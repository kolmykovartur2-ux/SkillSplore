import { useState } from 'react';
import { useApi } from '../lib/useApi.js';
import { api, ApiError } from '../lib/api.js';
import { useToast } from '../lib/toast.js';
import { Button, Card, Spinner, EmptyState, Field, Input, Badge } from '../components/ui.js';

interface Campaign { id: number; key: string; name: string; goal: string; status: string; _count?: { drafts: number; ideas: number } }

export function Campaigns() {
  const { data, loading, reload } = useApi<{ campaigns: Campaign[] }>('/campaigns');
  const toast = useToast();
  const [form, setForm] = useState({ key: '', name: '', goal: '' });
  const [busy, setBusy] = useState(false);

  const create = async () => {
    if (!form.key || !form.name || !form.goal) return;
    setBusy(true);
    try {
      await api.post('/campaigns', form);
      setForm({ key: '', name: '', goal: '' });
      toast('Campaign created.', 'success');
      await reload();
    } catch (err) {
      toast(err instanceof ApiError ? err.message : 'Failed to create campaign.', 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="page container">
      <h1>Campaigns</h1>
      <Card style={{ marginBottom: 20 }}>
        <div className="card-body">
          <h3>New campaign</h3>
          <div className="row-wrap">
            <Field label="Key">
              <Input value={form.key} onChange={(e) => setForm({ ...form, key: e.target.value })} placeholder="e.g. why-skillsplore" style={{ width: 200 }} />
            </Field>
            <Field label="Name">
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} style={{ width: 240 }} />
            </Field>
            <Field label="Goal">
              <Input value={form.goal} onChange={(e) => setForm({ ...form, goal: e.target.value })} style={{ width: 320 }} />
            </Field>
            <Button variant="primary" onClick={() => void create()} loading={busy}>
              Create
            </Button>
          </div>
        </div>
      </Card>

      {loading ? <Spinner /> : !data?.campaigns.length ? (
        <EmptyState title="No campaigns" />
      ) : (
        <div className="grid grid-cards">
          {data.campaigns.map((c) => (
            <Card key={c.id}>
              <div className="card-body">
                <div className="spread">
                  <h3>{c.name}</h3>
                  <Badge variant={c.status === 'ACTIVE' ? 'success' : ''}>{c.status.toLowerCase()}</Badge>
                </div>
                <p className="muted">{c.goal}</p>
                {c._count && (
                  <p className="muted num">
                    {c._count.drafts} drafts · {c._count.ideas} ideas
                  </p>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
