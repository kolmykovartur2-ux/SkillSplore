import { Link, useSearchParams } from 'react-router-dom';
import { useApi } from '../../lib/useApi.js';
import { AdminNav } from '../../components/AdminNav.js';
import { Badge, EmptyState, Select, Spinner } from '../../components/ui.js';
import { dateStr } from '../../lib/format.js';

interface Application { id: number; status: string; headline: string | null; submittedAt: string | null; user: { id: number; displayName: string; email: string }; subjects: string[] }

export function Applications() {
  const [params, setParams] = useSearchParams();
  const status = params.get('status') ?? 'PENDING';
  const { data, loading } = useApi<{ applications: Application[] }>(`/admin/applications?status=${status}`);

  return (
    <div>
      <AdminNav />
      <div className="section-title">
        <h1 className="mt-0">Tutor applications</h1>
        <Select value={status} onChange={(e) => setParams({ status: e.target.value })} style={{ width: 'auto' }}>
          <option value="PENDING">Pending</option>
          <option value="CHANGES_REQUESTED">Changes requested</option>
          <option value="APPROVED">Approved</option>
          <option value="REJECTED">Rejected</option>
          <option value="SUSPENDED">Suspended</option>
        </Select>
      </div>
      {loading ? <Spinner /> : (data?.applications.length ?? 0) === 0 ? (
        <EmptyState emoji="✅" title="Nothing in this queue" />
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Tutor</th><th>Headline</th><th>Subjects</th><th>Submitted</th><th></th></tr></thead>
            <tbody>
              {data!.applications.map((a) => (
                <tr key={a.id}>
                  <td><strong>{a.user.displayName}</strong><br /><small>{a.user.email}</small></td>
                  <td>{a.headline}</td>
                  <td>{a.subjects.map((s) => <Badge key={s}>{s}</Badge>)}</td>
                  <td>{dateStr(a.submittedAt)}</td>
                  <td><Link className="btn btn-sm btn-primary" to={`/admin/applications/${a.id}`}>Review</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
