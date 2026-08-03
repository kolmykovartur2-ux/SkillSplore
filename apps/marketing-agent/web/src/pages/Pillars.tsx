import { useApi } from '../lib/useApi.js';
import { api, ApiError } from '../lib/api.js';
import { useToast } from '../lib/toast.js';
import { Card, Spinner, Badge } from '../components/ui.js';

interface Pillar { id: number; key: string; name: string; description: string; targetPercentage: number; active: boolean }

export function Pillars() {
  const { data, loading, reload } = useApi<{ pillars: Pillar[] }>('/pillars');
  const toast = useToast();

  const toggleActive = async (p: Pillar) => {
    try {
      await api.patch(`/pillars/${p.id}`, { active: !p.active });
      await reload();
    } catch (err) {
      toast(err instanceof ApiError ? err.message : 'Failed to update pillar.', 'error');
    }
  };

  const totalTarget = (data?.pillars ?? []).reduce((sum, p) => sum + p.targetPercentage, 0);

  return (
    <div className="page container">
      <div className="section-title">
        <h1>Content pillars</h1>
        <span className="muted">Target distribution total: {totalTarget}%</span>
      </div>
      {loading ? (
        <Spinner />
      ) : (
        <div className="grid grid-cards">
          {data?.pillars.map((p) => (
            <Card key={p.id}>
              <div className="card-body">
                <div className="spread">
                  <h3>{p.name}</h3>
                  <Badge variant={p.active ? 'success' : 'danger'}>{p.active ? 'active' : 'inactive'}</Badge>
                </div>
                <p className="muted">{p.description}</p>
                <p className="num">{p.targetPercentage}% of cadence</p>
                <button className="btn btn-sm" onClick={() => void toggleActive(p)}>
                  {p.active ? 'Deactivate' : 'Activate'}
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
