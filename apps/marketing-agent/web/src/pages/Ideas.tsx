import { useState } from 'react';
import { useApi } from '../lib/useApi.js';
import { api, ApiError } from '../lib/api.js';
import { useToast } from '../lib/toast.js';
import { Button, Card, Spinner, EmptyState, Field, Select, Input } from '../components/ui.js';

interface Pillar { id: number; name: string }
interface Idea { id: number; title: string; notes: string | null; pillar?: { name: string } | null }

export function Ideas() {
  const { data: pillarsData } = useApi<{ pillars: Pillar[] }>('/pillars');
  const { data, loading, reload } = useApi<{ ideas: Idea[] }>('/ideas');
  const toast = useToast();
  const [pillarId, setPillarId] = useState('');
  const [count, setCount] = useState(3);
  const [manualTitle, setManualTitle] = useState('');
  const [busy, setBusy] = useState(false);

  const generate = async () => {
    if (!pillarId) return toast('Choose a pillar first.', 'error');
    setBusy(true);
    try {
      const res = await api.post<{ providerUsed: string; fellBackToTemplate: boolean }>('/ideas/generate', { pillarId: Number(pillarId), count });
      toast(`Generated ${count} ideas via ${res.providerUsed}${res.fellBackToTemplate ? ' (fell back from configured provider)' : ''}.`, 'success');
      await reload();
    } catch (err) {
      toast(err instanceof ApiError ? err.message : 'Failed to generate ideas.', 'error');
    } finally {
      setBusy(false);
    }
  };

  const addManual = async () => {
    if (!manualTitle) return;
    await api.post('/ideas', { title: manualTitle, pillarId: pillarId ? Number(pillarId) : undefined });
    setManualTitle('');
    await reload();
  };

  return (
    <div className="page container">
      <div className="section-title">
        <h1>Ideas</h1>
      </div>
      <Card style={{ marginBottom: 20 }}>
        <div className="card-body">
          <h3>Generate ideas</h3>
          <div className="row-wrap">
            <Field label="Pillar">
              <Select value={pillarId} onChange={(e) => setPillarId(e.target.value)} style={{ width: 240 }}>
                <option value="">Choose a pillar…</option>
                {pillarsData?.pillars.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Count">
              <Input type="number" min={1} max={10} value={count} onChange={(e) => setCount(Number(e.target.value))} style={{ width: 90 }} />
            </Field>
            <Button variant="primary" onClick={() => void generate()} loading={busy}>
              Generate
            </Button>
          </div>
          <div className="divider" />
          <h3>Add manually</h3>
          <div className="row-wrap">
            <Input placeholder="Idea title" value={manualTitle} onChange={(e) => setManualTitle(e.target.value)} style={{ flex: 1 }} />
            <Button onClick={() => void addManual()}>Add</Button>
          </div>
        </div>
      </Card>

      {loading ? <Spinner /> : !data?.ideas.length ? (
        <EmptyState title="No ideas yet" />
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Pillar</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              {data.ideas.map((i) => (
                <tr key={i.id}>
                  <td>{i.title}</td>
                  <td>{i.pillar?.name ?? '—'}</td>
                  <td className="muted">{i.notes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
