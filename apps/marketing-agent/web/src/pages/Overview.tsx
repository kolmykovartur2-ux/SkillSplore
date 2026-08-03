import { Link } from 'react-router-dom';
import { useApi } from '../lib/useApi.js';
import { useAuth } from '../lib/auth.js';
import { Card, Spinner } from '../components/ui.js';

interface Draft { id: number; status: string }

const TILES: [string, string, string][] = [
  ['/review-queue', 'Review queue', '📝'],
  ['/scheduled', 'Scheduled', '📅'],
  ['/published', 'Published', '✅'],
  ['/failed', 'Failed', '⚠️'],
  ['/ideas', 'Ideas', '💡'],
  ['/campaigns', 'Campaigns', '🎯'],
  ['/facts', 'Marketing facts', '📌'],
  ['/linkedin', 'LinkedIn connection', '🔗'],
];

export function Overview() {
  const { data, loading } = useApi<{ drafts: Draft[] }>('/drafts');
  const { config } = useAuth();

  const counts = (data?.drafts ?? []).reduce<Record<string, number>>((acc, d) => {
    acc[d.status] = (acc[d.status] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="page container">
      <div className="section-title">
        <div>
          <h1>Overview</h1>
          <p className="muted">
            Launch focus: {config?.launch.category} in {config?.launch.city}, {config?.launch.country} — {config?.launch.stage}.
            {config?.mockLinkedinApi && ' LinkedIn publishing is currently mocked (demo mode).'}
          </p>
        </div>
      </div>
      {loading ? (
        <Spinner />
      ) : (
        <div className="grid grid-cards">
          {TILES.map(([path, label, emoji]) => (
            <Link key={path} to={path} className="card card-hover" style={{ textDecoration: 'none' }}>
              <div className="card-body">
                <div style={{ fontSize: '1.6rem', marginBottom: 6 }}>{emoji}</div>
                <div style={{ fontWeight: 650 }}>{label}</div>
                {counts[label.toUpperCase().replace(' ', '_')] !== undefined && (
                  <div className="muted num">{counts[label.toUpperCase().replace(' ', '_')]}</div>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
      <Card style={{ marginTop: 20 }}>
        <div className="card-body">
          <h3>Draft status breakdown</h3>
          <div className="row-wrap">
            {Object.entries(counts).map(([status, count]) => (
              <span key={status} className="pill">
                {status.replace(/_/g, ' ').toLowerCase()}: {count}
              </span>
            ))}
            {Object.keys(counts).length === 0 && <span className="muted">No drafts yet — generate the launch calendar from Ideas/Briefs, or run the seed script.</span>}
          </div>
        </div>
      </Card>
    </div>
  );
}
