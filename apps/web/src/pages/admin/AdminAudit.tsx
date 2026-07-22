import { useApi } from '../../lib/useApi.js';
import { AdminNav } from '../../components/AdminNav.js';
import { EmptyState, Spinner } from '../../components/ui.js';
import { dateTime } from '../../lib/format.js';

interface Log { id: number; actorId: number | null; action: string; entityType: string | null; entityId: number | null; metadata: unknown; createdAt: string }

export function AdminAudit() {
  const { data, loading } = useApi<{ logs: Log[] }>('/admin/audit');

  return (
    <div>
      <AdminNav />
      <h1>Audit log</h1>
      {loading ? <Spinner /> : (data?.logs.length ?? 0) === 0 ? <EmptyState emoji="📜" title="No audit entries yet" /> : (
        <div className="table-wrap"><table className="table">
          <thead><tr><th>When</th><th>Actor</th><th>Action</th><th>Entity</th></tr></thead>
          <tbody>
            {data!.logs.map((l) => (
              <tr key={l.id}>
                <td style={{ whiteSpace: 'nowrap' }}>{dateTime(l.createdAt)}</td>
                <td>{l.actorId ?? '—'}</td>
                <td><code>{l.action}</code></td>
                <td>{l.entityType ? `${l.entityType} #${l.entityId ?? ''}` : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table></div>
      )}
    </div>
  );
}
