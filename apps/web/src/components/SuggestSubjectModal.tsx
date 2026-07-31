import { useState } from 'react';
import { api, ApiError } from '../lib/api.js';
import { useToast } from '../lib/toast.js';
import { Button, Field, Input, Modal, Select, Textarea } from './ui.js';

interface Category { id: number; name: string }
interface Subject { id: number; name: string }

interface Props {
  initialName: string;
  categories: Category[];
  onClose: () => void;
  // Called when the subject is now usable right away -- either it already
  // existed, or the suggestion matched an existing one exactly.
  onResolved: (subject: Subject) => void;
}

export function SuggestSubjectModal({ initialName, categories, onClose, onResolved }: Props) {
  const toast = useToast();
  const [name, setName] = useState(initialName);
  const [categoryId, setCategoryId] = useState('');
  const [needsNewCategory, setNeedsNewCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    try {
      const res = await api.post<
        | { resolution: 'already_exists'; subject: Subject }
        | { resolution: 'already_suggested'; suggestion: { name: string } }
        | { resolution: 'queued'; suggestion: { name: string } }
      >('/subjects/suggest', {
        name,
        suggestedCategoryId: !needsNewCategory && categoryId ? Number(categoryId) : null,
        newCategoryName: needsNewCategory ? newCategoryName : undefined,
        note: note || undefined,
      });
      if (res.resolution === 'already_exists') {
        toast(`"${res.subject.name}" already exists — added it for you.`, 'success');
        onResolved(res.subject);
      } else if (res.resolution === 'already_suggested') {
        toast('Someone already suggested this — it\'s in the review queue.', 'info');
        onClose();
      } else {
        toast('Thanks! We\'ll review it and add it if it\'s not a duplicate.', 'success');
        onClose();
      }
    } catch (e) {
      toast(e instanceof ApiError ? e.message : 'Could not submit suggestion.', 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title="Suggest a subject" onClose={onClose}>
      <p className="muted" style={{ marginTop: 0 }}>
        Can't find what you're after? Suggest it below. We check it against the existing catalogue
        first — if it's already there under a different spelling, you'll be able to use it immediately.
      </p>
      <Field label="Subject name">
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Ukulele" autoFocus />
      </Field>
      {!needsNewCategory && (
        <Field label="Closest existing category (optional)">
          <Select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
            <option value="">Not sure</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
        </Field>
      )}
      <label className="check" style={{ marginBottom: 12 }}>
        <input type="checkbox" checked={needsNewCategory} onChange={(e) => setNeedsNewCategory(e.target.checked)} />
        <span>This needs a whole new category, not just a new subject</span>
      </label>
      {needsNewCategory && (
        <Field label="Suggested category name">
          <Input value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} placeholder="e.g. Trades & DIY" />
        </Field>
      )}
      <Field label="Note for the reviewer (optional)" hint="e.g. who'd search for this, or how it differs from similar subjects">
        <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} />
      </Field>
      <div className="row" style={{ justifyContent: 'flex-end', marginTop: 8 }}>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="primary" loading={busy} disabled={name.trim().length < 2} onClick={submit}>Submit suggestion</Button>
      </div>
    </Modal>
  );
}
