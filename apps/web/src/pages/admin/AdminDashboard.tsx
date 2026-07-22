import { Link } from 'react-router-dom';
import { useApi } from '../../lib/useApi.js';
import { AdminNav } from '../../components/AdminNav.js';
import { Spinner } from '../../components/ui.js';

interface Stats { users: number; approvedTutors: number; pendingApplications: number; openRequests: number; engagements: number; completedEngagements: number; reviews: number; openReports: number }

export function AdminDashboard() {
  const { data, loading } = useApi<{ stats: Stats }>('/admin/stats');
  if (loading) return <><AdminNav /><Spinner /></>;
  const s = data!.stats;

  const tiles: Array<[string, number, string]> = [
    ['Total users', s.users, '/admin/users'],
    ['Approved tutors', s.approvedTutors, '/admin/applications?status=APPROVED'],
    ['Pending applications', s.pendingApplications, '/admin/applications'],
    ['Open requests', s.openRequests, '/admin'],
    ['Engagements', s.engagements, '/admin'],
    ['Completed', s.completedEngagements, '/admin'],
    ['Reviews', s.reviews, '/admin/reviews'],
    ['Open reports', s.openReports, '/admin/reports'],
  ];

  return (
    <div>
      <AdminNav />
      <h1>Administration</h1>
      <div className="grid grid-cards">
        {tiles.map(([label, value, to]) => (
          <Link key={label} to={to} className="card" style={{ color: 'inherit' }}>
            <div className="card-body center">
              <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--primary)' }}>{value}</div>
              <div className="muted">{label}</div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
