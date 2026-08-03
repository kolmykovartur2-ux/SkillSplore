import { useApi } from '../lib/useApi.js';
import { Spinner, EmptyState } from '../components/ui.js';
import { formatDate } from '../lib/format.js';

interface LogEntry { id: number; actorId: number | null; action: string; entityType: string | null; entityId: number | null; createdAt: string }

export function AuditLog() {
  const { data, loading } = useApi<{ logs: LogEntry[] }>('/audit-log?take=200');
  return (
    <div className="page container">
      <h1>Audit log</h1>
      {loading ? <Spinner /> : !data?.logs.length ? (
        <EmptyState title="No activity yet" />
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>When</th>
                <th>Actor</th>
                <th>Action</th>
                <th>Entity</th>
              </tr>
            </thead>
            <tbody>
              {data.logs.map((l) => (
                <tr key={l.id}>
                  <td>{formatDate(l.createdAt)}</td>
                  <td>{l.actorId ?? 'system'}</td>
                  <td>{l.action}</td>
                  <td>
                    {l.entityType ?? '—'} {l.entityId ?? ''}
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
