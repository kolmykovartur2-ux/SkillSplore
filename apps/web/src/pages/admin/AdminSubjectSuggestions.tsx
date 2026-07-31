import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api, ApiError } from '../../lib/api.js';
import { useApi } from '../../lib/useApi.js';
import { useToast } from '../../lib/toast.js';
import { AdminNav } from '../../components/AdminNav.js';
import { Button, Card, EmptyState, Select, Spinner } from '../../components/ui.js';
import { dateStr } from '../../lib/format.js';

interface Category { id: number; name: string }
interface Suggestion {
  id: number;
  name: string;
  note: string | null;
  newCategoryName: string | null;
  status: string;
  createdAt: string;
  submittedBy: { displayName: string; email: string };
  suggestedCategory: { id: number; name: string } | null;
}

export function AdminSubjectSuggestions() {
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const status = params.get('status') ?? 'PENDING';
  const { data, loading, reload } = useApi<{ suggestions: Suggestion[] }>(`/admin/subject-suggestions?status=${status}`);
  const { data: cats } = useApi<{ categories: Category[] }>('/taxonomy/categories');
  const { data: subs } = useApi<{ subjects: Array<{ id: number; name: string }> }>('/taxonomy/subjects');
  const [choice, setChoice] = useState<Record<number, string>>({});
  const [busyId, setBusyId] = useState<number | null>(null);

  const act = async (id: number, fn: () => Promise<unknown>) => {
    setBusyId(id);
    try { await fn(); toast('Done', 'success'); reload(); }
    catch (e) { toast(e instanceof ApiError ? e.message : 'Failed', 'error'); }
    finally { setBusyId(null); }
  };

  // Category and subject ids overlap, so dropdown values are prefixed
  // ("cat:3" / "sub:3") to tell them apart -- picking one and clicking the
  // wrong action button (approve vs. merge) is refused rather than silently
  // acting on the wrong entity.
  const approve = (s: Suggestion) => {
    const picked = choice[s.id];
    if (picked && !picked.startsWith('cat:')) return toast('That\'s an existing subject, not a category — use "Merge into existing" instead.', 'error');
    const categoryId = picked ? Number(picked.slice(4)) : s.suggestedCategory?.id ?? null;
    return act(s.id, () => api.post(`/admin/subject-suggestions/${s.id}/approve`, { categoryId }));
  };
  const merge = (s: Suggestion) => {
    const picked = choice[s.id];
    if (!picked || !picked.startsWith('sub:')) return toast('Pick which existing subject this matches first.', 'error');
    const subjectId = Number(picked.slice(4));
    return act(s.id, () => api.post(`/admin/subject-suggestions/${s.id}/merge`, { subjectId }));
  };
  const reject = (s: Suggestion) => act(s.id, () => api.post(`/admin/subject-suggestions/${s.id}/reject`, {}));

  return (
    <div>
      <AdminNav />
      <div className="section-title">
        <h1 className="mt-0">Subject suggestions</h1>
        <Select value={status} onChange={(e) => setParams(e.target.value ? { status: e.target.value } : {})} style={{ width: 'auto' }}>
          <option value="PENDING">Pending</option>
          <option value="APPROVED">Approved</option>
          <option value="MERGED">Merged</option>
          <option value="REJECTED">Rejected</option>
          <option value="ALL">All</option>
        </Select>
      </div>
      {loading ? <Spinner /> : (data?.suggestions.length ?? 0) === 0 ? (
        <EmptyState emoji="💡" title="No suggestions here">Nothing in this queue right now.</EmptyState>
      ) : (
        <div className="stack">
          {data!.suggestions.map((s) => (
            <Card key={s.id}><div className="card-body">
              <div className="spread">
                <div>
                  <strong>{s.name}</strong>
                  <div className="muted" style={{ fontSize: '0.85rem' }}>
                    Suggested by {s.submittedBy.displayName} ({s.submittedBy.email}) · {dateStr(s.createdAt)}
                  </div>
                </div>
              </div>
              {s.newCategoryName && <p className="muted" style={{ marginTop: 8 }}>Requested new category: <strong>{s.newCategoryName}</strong></p>}
              {s.suggestedCategory && <p className="muted" style={{ marginTop: 8 }}>Suggested category: <strong>{s.suggestedCategory.name}</strong></p>}
              {s.note && <p style={{ marginTop: 8 }}>“{s.note}”</p>}
              {status === 'PENDING' && (
                <>
                  <div className="divider" />
                  <div className="row-wrap">
                    <Select value={choice[s.id] ?? ''} onChange={(e) => setChoice((c) => ({ ...c, [s.id]: e.target.value }))} style={{ width: 260 }}>
                      <option value="">— pick a category (to approve) or an existing subject (to merge) —</option>
                      <optgroup label="Categories (approve as new subject)">
                        {cats?.categories.map((c) => <option key={`c${c.id}`} value={`cat:${c.id}`}>{c.name}</option>)}
                      </optgroup>
                      <optgroup label="Existing subjects (merge into)">
                        {subs?.subjects.map((sub) => <option key={`s${sub.id}`} value={`sub:${sub.id}`}>{sub.name}</option>)}
                      </optgroup>
                    </Select>
                    <Button variant="primary" loading={busyId === s.id} onClick={() => approve(s)}>Approve as new</Button>
                    <Button loading={busyId === s.id} onClick={() => merge(s)}>Merge into existing</Button>
                    <Button variant="danger" loading={busyId === s.id} onClick={() => reject(s)}>Reject</Button>
                  </div>
                </>
              )}
            </div></Card>
          ))}
        </div>
      )}
    </div>
  );
}
