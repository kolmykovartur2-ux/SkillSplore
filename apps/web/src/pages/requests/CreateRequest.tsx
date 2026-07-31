import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, ApiError } from '../../lib/api.js';
import { useApi } from '../../lib/useApi.js';
import { useToast } from '../../lib/toast.js';
import { Alert, Button, Card, Field, Input, Select, Textarea } from '../../components/ui.js';
import { SuggestSubjectModal } from '../../components/SuggestSubjectModal.js';

interface Category { id: number; name: string; subjects: Array<{ id: number; name: string }> }
interface Level { id: number; name: string }

export function CreateRequest() {
  const navigate = useNavigate();
  const toast = useToast();
  const { data: cats, reload: reloadCats } = useApi<{ categories: Category[] }>('/taxonomy/categories');
  const { data: lvls } = useApi<{ levels: Level[] }>('/taxonomy/levels');
  const [form, setForm] = useState({ subjectId: '', levelId: '', title: '', description: '', deliveryMode: 'BOTH', country: '', city: '', budgetMin: '', budgetMax: '', timing: '' });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [suggesting, setSuggesting] = useState(false);

  const set = (patch: Partial<typeof form>) => setForm((f) => ({ ...f, ...patch }));

  const submit = async (publish: boolean) => {
    setError(null); setBusy(true);
    try {
      const body = {
        subjectId: Number(form.subjectId),
        levelId: form.levelId ? Number(form.levelId) : null,
        title: form.title,
        description: form.description,
        deliveryMode: form.deliveryMode,
        country: form.country || undefined,
        city: form.city || undefined,
        budgetMinCents: form.budgetMin ? Math.round(Number(form.budgetMin) * 100) : null,
        budgetMaxCents: form.budgetMax ? Math.round(Number(form.budgetMax) * 100) : null,
        currency: form.country === 'Australia' ? 'AUD' : 'NZD',
        timing: form.timing || undefined,
        publish,
      };
      const { request } = await api.post<{ request: { id: number } }>('/requests', body);
      toast(publish ? 'Request published' : 'Draft saved', 'success');
      navigate(`/requests/${request.id}`);
    } catch (e) { setError(e instanceof ApiError ? e.message : 'Failed to create request.'); }
    finally { setBusy(false); }
  };

  const onSubmit = (e: FormEvent) => { e.preventDefault(); submit(true); };

  return (
    <div className="container-narrow" style={{ margin: '0 auto' }}>
      <h1>Post a tutoring request</h1>
      <Card><div className="card-body">
        {error && <Alert type="error">{error}</Alert>}
        <form onSubmit={onSubmit}>
          <Field label="Subject">
            <Select value={form.subjectId} onChange={(e) => set({ subjectId: e.target.value })} required>
              <option value="">Choose a subject…</option>
              {cats?.categories.map((c) => (
                <optgroup key={c.id} label={c.name}>
                  {c.subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </optgroup>
              ))}
            </Select>
            <button type="button" className="btn btn-ghost btn-sm" style={{ marginTop: 6, padding: '2px 0' }} onClick={() => setSuggesting(true)}>
              Can't find your subject? Suggest one
            </button>
          </Field>
          {suggesting && (
            <SuggestSubjectModal
              initialName=""
              categories={(cats?.categories ?? []).map((c) => ({ id: c.id, name: c.name }))}
              onClose={() => setSuggesting(false)}
              onResolved={(subject) => {
                setSuggesting(false);
                set({ subjectId: String(subject.id) });
                reloadCats();
              }}
            />
          )}
          <Field label="Level (optional)">
            <Select value={form.levelId} onChange={(e) => set({ levelId: e.target.value })}>
              <option value="">Any level</option>
              {lvls?.levels.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
            </Select>
          </Field>
          <Field label="Title"><Input value={form.title} onChange={(e) => set({ title: e.target.value })} required minLength={4} placeholder="e.g. Help with NCEA Level 3 calculus" /></Field>
          <Field label="What help do you need?"><Textarea value={form.description} onChange={(e) => set({ description: e.target.value })} required minLength={10} /></Field>
          <Field label="Format">
            <Select value={form.deliveryMode} onChange={(e) => set({ deliveryMode: e.target.value })}>
              <option value="BOTH">Online or in person</option>
              <option value="ONLINE">Online</option>
              <option value="IN_PERSON">In person</option>
            </Select>
          </Field>
          {form.deliveryMode !== 'ONLINE' && (
            <div className="grid grid-2">
              <Field label="Country">
                <Select value={form.country} onChange={(e) => set({ country: e.target.value })}>
                  <option value="">—</option><option>New Zealand</option><option>Australia</option>
                </Select>
              </Field>
              <Field label="City"><Input value={form.city} onChange={(e) => set({ city: e.target.value })} /></Field>
            </div>
          )}
          <div className="grid grid-2">
            <Field label="Budget min / hr (optional)"><Input type="number" min={0} value={form.budgetMin} onChange={(e) => set({ budgetMin: e.target.value })} /></Field>
            <Field label="Budget max / hr (optional)"><Input type="number" min={0} value={form.budgetMax} onChange={(e) => set({ budgetMax: e.target.value })} /></Field>
          </div>
          <Field label="Timing (optional)"><Input value={form.timing} onChange={(e) => set({ timing: e.target.value })} placeholder="e.g. Weekday evenings" /></Field>
          <div className="row">
            <Button type="submit" variant="primary" loading={busy}>Publish request</Button>
            <Button type="button" onClick={() => submit(false)} loading={busy}>Save as draft</Button>
          </div>
        </form>
      </div></Card>
    </div>
  );
}
