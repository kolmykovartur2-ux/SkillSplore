import { api, ApiError } from '../../lib/api.js';
import { useApi } from '../../lib/useApi.js';
import { useToast } from '../../lib/toast.js';
import { AdminNav } from '../../components/AdminNav.js';
import { Button, EmptyState, Spinner, StatusBadge, Stars } from '../../components/ui.js';
import { dateStr } from '../../lib/format.js';

interface Review { id: number; rating: number; title: string | null; body: string; status: string; createdAt: string; student: { displayName: string }; tutor: { profileId: number; displayName: string } }

export function AdminReviews() {
  const { data, loading, reload } = useApi<{ reviews: Review[] }>('/admin/reviews');
  const toast = useToast();

  const act = async (id: number, path: 'hide' | 'restore') => {
    try { await api.post(`/admin/reviews/${id}/${path}`); toast('Updated', 'success'); reload(); }
    catch (e) { toast(e instanceof ApiError ? e.message : 'Failed', 'error'); }
  };

  return (
    <div>
      <AdminNav />
      <h1>Reviews</h1>
      {loading ? <Spinner /> : (data?.reviews.length ?? 0) === 0 ? <EmptyState emoji="⭐" title="No reviews yet" /> : (
        <div className="table-wrap"><table className="table">
          <thead><tr><th>Rating</th><th>Review</th><th>Student → Tutor</th><th>Status</th><th>Date</th><th></th></tr></thead>
          <tbody>
            {data!.reviews.map((r) => (
              <tr key={r.id}>
                <td><Stars rating={r.rating} /></td>
                <td><strong>{r.title}</strong><br /><span className="muted">{r.body.slice(0, 80)}{r.body.length > 80 ? '…' : ''}</span></td>
                <td>{r.student.displayName} → {r.tutor.displayName}</td>
                <td><StatusBadge status={r.status} /></td>
                <td>{dateStr(r.createdAt)}</td>
                <td>{r.status === 'PUBLISHED' ? <Button className="btn-sm" variant="danger" onClick={() => act(r.id, 'hide')}>Hide</Button> : <Button className="btn-sm" onClick={() => act(r.id, 'restore')}>Restore</Button>}</td>
              </tr>
            ))}
          </tbody>
        </table></div>
      )}
    </div>
  );
}
