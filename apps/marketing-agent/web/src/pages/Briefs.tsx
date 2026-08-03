import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useApi } from '../lib/useApi.js';
import { api, ApiError } from '../lib/api.js';
import { useToast } from '../lib/toast.js';
import { Button, Card, Spinner, EmptyState, Field, Select } from '../components/ui.js';

interface Idea { id: number; title: string; pillarId: number | null }
interface Brief { id: number; objective: string; mainIdea: string; pillar?: { name: string } | null }

export function Briefs() {
  const { data: ideasData } = useApi<{ ideas: Idea[] }>('/ideas');
  const { data, loading, reload } = useApi<{ briefs: Brief[] }>('/briefs');
  const toast = useToast();
  const [ideaId, setIdeaId] = useState('');
  const [busy, setBusy] = useState(false);

  const generate = async () => {
    if (!ideaId) return toast('Choose an idea first.', 'error');
    setBusy(true);
    try {
      const res = await api.post<{ brief: { id: number }; providerUsed: string; fellBackToTemplate: boolean }>('/briefs/generate', { ideaId: Number(ideaId) });
      toast(`Brief #${res.brief.id} generated via ${res.providerUsed}.`, 'success');
      await reload();
    } catch (err) {
      toast(err instanceof ApiError ? err.message : 'Failed to generate brief.', 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="page container">
      <div className="section-title">
        <h1>Briefs</h1>
      </div>
      <Card style={{ marginBottom: 20 }}>
        <div className="card-body">
          <h3>Generate a brief from an idea</h3>
          <div className="row-wrap">
            <Field label="Idea">
              <Select value={ideaId} onChange={(e) => setIdeaId(e.target.value)} style={{ width: 320 }}>
                <option value="">Choose an idea…</option>
                {ideasData?.ideas.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.title}
                  </option>
                ))}
              </Select>
            </Field>
            <Button variant="primary" onClick={() => void generate()} loading={busy}>
              Generate brief
            </Button>
          </div>
        </div>
      </Card>

      {loading ? <Spinner /> : !data?.briefs.length ? (
        <EmptyState title="No briefs yet" />
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Objective</th>
                <th>Pillar</th>
                <th>Main idea</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {data.briefs.map((b) => (
                <tr key={b.id}>
                  <td>{b.objective}</td>
                  <td>{b.pillar?.name ?? '—'}</td>
                  <td className="muted">{b.mainIdea}</td>
                  <td>
                    <Link to={`/briefs/${b.id}`}>
                      <Button className="btn-sm">Generate drafts</Button>
                    </Link>
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
