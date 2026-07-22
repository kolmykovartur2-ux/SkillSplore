import { useState } from 'react';
import { api, ApiError } from '../../lib/api.js';
import { useApi } from '../../lib/useApi.js';
import { useToast } from '../../lib/toast.js';
import { AdminNav } from '../../components/AdminNav.js';
import { Badge, Button, Input, Spinner, StatusBadge } from '../../components/ui.js';
import { dateStr } from '../../lib/format.js';

interface AdminUser { id: number; email: string; displayName: string; roles: string[]; status: string; createdAt: string; emailVerifiedAt: string | null }

export function AdminUsers() {
  const [q, setQ] = useState('');
  const { data, loading, reload } = useApi<{ users: AdminUser[] }>(`/admin/users${q ? `?q=${encodeURIComponent(q)}` : ''}`);
  const toast = useToast();

  const act = async (id: number, path: 'suspend' | 'reinstate') => {
    try { await api.post(`/admin/users/${id}/${path}`, path === 'suspend' ? { reason: 'Suspended by administrator' } : undefined); toast('Updated', 'success'); reload(); }
    catch (e) { toast(e instanceof ApiError ? e.message : 'Failed', 'error'); }
  };

  return (
    <div>
      <AdminNav />
      <div className="section-title"><h1 className="mt-0">Users</h1><Input placeholder="Search name or email…" value={q} onChange={(e) => setQ(e.target.value)} style={{ maxWidth: 260 }} /></div>
      {loading ? <Spinner /> : (
        <div className="table-wrap"><table className="table">
          <thead><tr><th>Name</th><th>Email</th><th>Roles</th><th>Status</th><th>Joined</th><th></th></tr></thead>
          <tbody>
            {data?.users.map((u) => (
              <tr key={u.id}>
                <td><strong>{u.displayName}</strong></td>
                <td>{u.email} {!u.emailVerifiedAt && <Badge variant="warning">unverified</Badge>}</td>
                <td>{u.roles.map((r) => <Badge key={r}>{r.toLowerCase()}</Badge>)}</td>
                <td><StatusBadge status={u.status} /></td>
                <td>{dateStr(u.createdAt)}</td>
                <td>{u.status === 'ACTIVE' ? <Button className="btn-sm" variant="danger" onClick={() => act(u.id, 'suspend')}>Suspend</Button> : <Button className="btn-sm" onClick={() => act(u.id, 'reinstate')}>Reinstate</Button>}</td>
              </tr>
            ))}
          </tbody>
        </table></div>
      )}
    </div>
  );
}
