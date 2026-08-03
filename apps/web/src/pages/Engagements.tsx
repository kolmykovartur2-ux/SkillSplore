import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api, ApiError } from '../lib/api.js';
import { useApi } from '../lib/useApi.js';
import { useToast } from '../lib/toast.js';
import type { PublicUser } from '../lib/types.js';
import { Badge, Button, Card, EmptyState, Field, Input, Modal, Spinner, StatusBadge, Textarea } from '../components/ui.js';
import { dateStr } from '../lib/format.js';

interface Engagement {
  id: number; title: string; status: string; createdAt: string; completedAt: string | null; conversationId: number | null;
  subject: { id: number; name: string } | null; tutor: { profileId: number } & PublicUser; student: PublicUser;
  role: 'student' | 'tutor' | 'observer'; hasReview: boolean; canReview: boolean; paymentNote: string; requestKind?: string;
}

export function Engagements() {
  const { data, loading, reload } = useApi<{ engagements: Engagement[] }>('/engagements');
  const toast = useToast();
  const [reviewing, setReviewing] = useState<Engagement | null>(null);

  const act = async (id: number, action: 'complete' | 'cancel') => {
    try { await api.post(`/engagements/${id}/${action}`); toast('Updated', 'success'); reload(); }
    catch (e) { toast(e instanceof ApiError ? e.message : 'Failed', 'error'); }
  };

  if (loading) return <Spinner />;
  const list = data?.engagements ?? [];

  return (
    <div className="stack">
      <h1>Engagements</h1>
      <p className="muted">Record and track learning and service arrangements you’ve made. Payment is handled directly between both people.</p>
      {list.length === 0 ? <EmptyState emoji="🤝" title="No engagements yet">Arrange one from a conversation once you’ve agreed to work together.</EmptyState> : (
        <div className="grid grid-cards">
          {list.map((e) => (
            <Card key={e.id}><div className="card-body stack-sm">
              <div className="spread"><strong>{e.title}</strong><StatusBadge status={e.status} /></div>
              <div className="muted" style={{ fontSize: '0.86rem' }}>
                {e.subject && <Badge>{e.subject.name}</Badge>}{' '}
                {e.role === 'student' ? `with ${e.tutor.displayName}` : `for ${e.student.displayName}`} · {dateStr(e.createdAt)}
              </div>
              <div className="row-wrap">
                {e.conversationId && <Link className="btn btn-sm" to={`/messages/${e.conversationId}`}>Open chat</Link>}
                {e.status === 'ARRANGED' && <Button className="btn-sm" variant="primary" onClick={() => act(e.id, 'complete')}>Mark completed</Button>}
                {e.status === 'ARRANGED' && <Button className="btn-sm" onClick={() => act(e.id, 'cancel')}>Cancel</Button>}
                {e.canReview && <Button className="btn-sm" variant="accent" onClick={() => setReviewing(e)}>Leave a review</Button>}
                {e.hasReview && <Badge variant="success">Reviewed</Badge>}
              </div>
            </div></Card>
          ))}
        </div>
      )}
      {reviewing && <ReviewModal engagement={reviewing} onClose={() => setReviewing(null)} onDone={() => { setReviewing(null); reload(); }} />}
    </div>
  );
}

function ReviewModal({ engagement, onClose, onDone }: { engagement: Engagement; onClose: () => void; onDone: () => void }) {
  const toast = useToast();
  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    try {
      await api.post('/reviews', { engagementId: engagement.id, rating, title: title || undefined, body });
      toast('Review published', 'success');
      onDone();
    } catch (e) { toast(e instanceof ApiError ? e.message : 'Failed', 'error'); }
    finally { setBusy(false); }
  };

  return (
    <Modal title={`Review ${engagement.tutor.displayName}`} onClose={onClose}>
      <Field label="Rating">
        <div className="stars" role="radiogroup" aria-label="Rating out of 5 stars" style={{ fontSize: '1.6rem' }}>
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={n === rating}
              aria-label={`${n} star${n === 1 ? '' : 's'}`}
              className={n <= rating ? '' : 'empty'}
              style={{ background: 'none', border: 'none', padding: 2, cursor: 'pointer', font: 'inherit', color: 'inherit' }}
              onClick={() => setRating(n)}
            >
              ★
            </button>
          ))}
        </div>
      </Field>
      <Field label="Title (optional)"><Input value={title} onChange={(e) => setTitle(e.target.value)} /></Field>
      <Field label="Your review"><Textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Share your experience and feedback." /></Field>
      <Button variant="primary" className="btn-block" loading={busy} disabled={body.trim().length < 4} onClick={submit}>Publish review</Button>
    </Modal>
  );
}
