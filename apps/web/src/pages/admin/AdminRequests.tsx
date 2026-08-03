import { useApi } from '../../lib/useApi.js';
import { AdminNav } from '../../components/AdminNav.js';
import { EmptyState, Spinner, StatusBadge, Badge } from '../../components/ui.js';
import { dateStr } from '../../lib/format.js';

interface AdminRequest {
  id: number;
  title: string;
  status: string;
  hidden: boolean;
  subject: string;
  student: { id: number; displayName: string };
  responseCount: number;
  createdAt: string;
}

// Read-only oversight list. Moderation (hiding a request) is already handled
// through the reports flow (Admin > Reports); this page exists so an admin
// can proactively browse all requests instead of only reaching one reactively
// via a report — see docs/USER_JOURNEY_AUDIT.md, "Review requests".
export function AdminRequests() {
  const { data, loading } = useApi<{ requests: AdminRequest[] }>('/admin/requests');

  return (
    <div>
      <AdminNav />
      <h1>Requests</h1>
      {loading ? (
        <Spinner />
      ) : (data?.requests.length ?? 0) === 0 ? (
        <EmptyState emoji="📋" title="No requests yet" />
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Subject</th>
                <th>Student</th>
                <th>Status</th>
                <th>Responses</th>
                <th>Posted</th>
              </tr>
            </thead>
            <tbody>
              {data!.requests.map((r) => (
                <tr key={r.id}>
                  <td>
                    {r.title} {r.hidden && <Badge variant="danger">hidden</Badge>}
                  </td>
                  <td>{r.subject}</td>
                  <td>{r.student.displayName}</td>
                  <td>
                    <StatusBadge status={r.status} />
                  </td>
                  <td>{r.responseCount}</td>
                  <td>{dateStr(r.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
