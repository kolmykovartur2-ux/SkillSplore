import { Link, useSearchParams } from 'react-router-dom';
import { useApi } from '../../lib/useApi.js';
import { AdminNav } from '../../components/AdminNav.js';
import { Badge, EmptyState, Select, Spinner, StatusBadge } from '../../components/ui.js';
import { dateStr } from '../../lib/format.js';

interface Report { id: number; entityType: string; entityId: number; reason: string; status: string; createdAt: string; reporter: { displayName: string } }

export function AdminReports() {
  const [params, setParams] = useSearchParams();
  const status = params.get('status') ?? '';
  const { data, loading } = useApi<{ reports: Report[] }>(`/admin/reports${status ? `?status=${status}` : ''}`);

  return (
    <div>
      <AdminNav />
      <div className="section-title">
        <h1 className="mt-0">Reports</h1>
        <Select value={status} onChange={(e) => setParams(e.target.value ? { status: e.target.value } : {})} style={{ width: 'auto' }}>
          <option value="">All</option><option value="OPEN">Open</option><option value="INVESTIGATING">Investigating</option><option value="RESOLVED">Resolved</option><option value="DISMISSED">Dismissed</option>
        </Select>
      </div>
      {loading ? <Spinner /> : (data?.reports.length ?? 0) === 0 ? <EmptyState emoji="🧯" title="No reports" /> : (
        <div className="table-wrap"><table className="table">
          <thead><tr><th>Type</th><th>Reason</th><th>Reporter</th><th>Status</th><th>Created</th><th></th></tr></thead>
          <tbody>
            {data!.reports.map((r) => (
              <tr key={r.id}>
                <td><Badge>{r.entityType.replace('_', ' ').toLowerCase()} #{r.entityId}</Badge></td>
                <td>{r.reason}</td>
                <td>{r.reporter.displayName}</td>
                <td><StatusBadge status={r.status} /></td>
                <td>{dateStr(r.createdAt)}</td>
                <td><Link className="btn btn-sm btn-primary" to={`/admin/reports/${r.id}`}>Open</Link></td>
              </tr>
            ))}
          </tbody>
        </table></div>
      )}
    </div>
  );
}
