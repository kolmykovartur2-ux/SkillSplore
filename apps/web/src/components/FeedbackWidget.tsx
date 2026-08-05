import { useState, type FormEvent } from 'react';
import { useLocation } from 'react-router-dom';
import { api, ApiError } from '../lib/api.js';
import { useAuth } from '../lib/auth.js';
import { Button, Field, Input } from './ui.js';

const KINDS = [
  { value: 'BUG', label: 'Something is broken' },
  { value: 'SUGGESTION', label: 'I have a suggestion' },
  { value: 'QUESTION', label: 'I have a question' },
  { value: 'COMPLAINT', label: 'I want to complain' },
  { value: 'PRAISE', label: 'Something worked well' },
  { value: 'OTHER', label: 'Something else' },
];

/**
 * Persistent feedback affordance.
 *
 * Deliberately a form that posts to the API rather than a mailto: link. A
 * mailto: assumes a configured mail client, which many people on a phone or a
 * shared machine do not have -- the message is silently lost and nobody knows
 * it was lost.
 *
 * The current path is submitted automatically. A bug report that says which
 * page it happened on is worth several rounds of correspondence.
 */
export function FeedbackWidget() {
  const { user } = useAuth();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ kind: 'SUGGESTION', message: '', email: '' });

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true); setError(null);
    try {
      await api.post('/feedback', {
        kind: form.kind,
        message: form.message,
        email: form.email || undefined,
        pageUrl: location.pathname + location.search,
      });
      setSent(true);
      setForm({ kind: 'SUGGESTION', message: '', email: '' });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not send that. Please try again.');
    } finally { setBusy(false); }
  };

  const close = () => { setOpen(false); setSent(false); setError(null); };

  if (!open) {
    return (
      <button type="button" className="feedback-fab" onClick={() => setOpen(true)}>
        Feedback
      </button>
    );
  }

  return (
    <div className="feedback-panel" role="dialog" aria-label="Send feedback">
      <div className="feedback-panel-head">
        <strong>Send feedback</strong>
        <button type="button" className="btn btn-ghost btn-sm" onClick={close} aria-label="Close feedback">✕</button>
      </div>

      {sent ? (
        <div className="feedback-panel-body">
          <p>Thanks — a human will read this.</p>
          <Button variant="outline" className="btn-block" onClick={close}>Close</Button>
        </div>
      ) : (
        <form className="feedback-panel-body" onSubmit={submit}>
          {error && <p className="muted" style={{ color: 'var(--danger)' }}>{error}</p>}

          <Field label="What kind of feedback?">
            <select className="input" value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value })}>
              {KINDS.map((k) => <option key={k.value} value={k.value}>{k.label}</option>)}
            </select>
          </Field>

          <Field label="Tell us more">
            <textarea
              className="input"
              rows={4}
              value={form.message}
              onChange={(e) => setForm({ ...form, message: e.target.value })}
              required
              minLength={5}
              maxLength={4000}
              placeholder="What happened, or what would you like to see?"
            />
          </Field>

          {/* Only asked of signed-out visitors -- we already have it otherwise,
              and asking again invites a typo. */}
          {!user && (
            <Field label="Your email" hint="Optional. Without it we cannot reply, but the message still reaches us.">
              <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </Field>
          )}

          <Button type="submit" variant="primary" className="btn-block" loading={busy}>Send</Button>
        </form>
      )}
    </div>
  );
}
