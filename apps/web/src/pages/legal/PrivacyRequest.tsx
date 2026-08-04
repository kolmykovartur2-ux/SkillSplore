import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { api, ApiError } from '../../lib/api.js';
import { Alert, Button, Card, Field, Input } from '../../components/ui.js';

const REQUEST_TYPES = [
  { value: 'ACCESS', label: 'Access — send me a copy of what you hold about me' },
  { value: 'CORRECTION', label: 'Correction — something you hold about me is wrong' },
  { value: 'EXPORT', label: 'Export — give me my information in a portable format' },
  { value: 'DEACTIVATION', label: 'Deactivate my account' },
  { value: 'DELETION', label: 'Delete my account and my personal information' },
  { value: 'MARKETING_OPT_OUT', label: 'Stop sending me marketing' },
  { value: 'CONSENT_WITHDRAWAL', label: 'Withdraw an optional consent' },
  { value: 'COMPLAINT', label: 'Complaint about how my information was handled' },
  { value: 'AUTOMATED_DECISION_ENQUIRY', label: 'Question about an automated decision' },
];

/**
 * Open to visitors who are not signed in, deliberately.
 *
 * Someone whose account was closed, or who appears in another user's content
 * without ever having registered, still has the right to ask what is held
 * about them. Putting this behind a login would exclude exactly those people.
 */
export function PrivacyRequest() {
  const [form, setForm] = useState({ type: 'ACCESS', contactEmail: '', details: '' });
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true); setError(null);
    try {
      await api.post('/privacy-requests', form);
      setDone(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not submit your request.');
    } finally { setBusy(false); }
  };

  if (done) {
    return (
      <div className="container-narrow" style={{ margin: '0 auto' }}>
        <Card>
          <div className="card-body">
            <h1>Request received</h1>
            <Alert type="success">
              We have recorded your request and will contact you at the email address you gave.
            </Alert>
            <p className="muted">
              We may need to verify your identity before we can act on it. The check will be
              proportionate to what you have asked for — we will not ask for identity documents
              to action a simple marketing opt-out.
            </p>
            <p className="muted">
              Read how we handle these requests in the{' '}
              <Link to="/privacy">privacy policy</Link>.
            </p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="container-narrow" style={{ margin: '0 auto' }}>
      <Card>
        <div className="card-body">
          <h1>Make a privacy request</h1>
          <p className="muted">
            Use this form to ask for a copy of your information, correct it, delete it, withdraw a
            consent, or make a complaint. You do not need an account to use this form.
          </p>

          {error && <Alert type="error">{error}</Alert>}

          <form onSubmit={submit}>
            <Field label="What would you like us to do?">
              <select
                className="input"
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
              >
                {REQUEST_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </Field>

            <Field label="Your email address" hint="We use this only to reply to this request.">
              <Input
                type="email"
                value={form.contactEmail}
                onChange={(e) => setForm({ ...form, contactEmail: e.target.value })}
                required
              />
            </Field>

            <Field
              label="Details"
              hint="Tell us what you need. If you are asking us to correct something, say what is wrong and what it should say."
            >
              <textarea
                className="input"
                rows={6}
                value={form.details}
                onChange={(e) => setForm({ ...form, details: e.target.value })}
                required
                minLength={10}
                maxLength={4000}
              />
            </Field>

            <div className="alert alert-info" style={{ marginBottom: 14, fontSize: '0.9rem' }}>
              <strong>What we collect here:</strong> your email address and what you write above.
              We use it only to handle this request and to keep a record that we did. It is not
              used for marketing. Providing it is necessary for us to act on the request.{' '}
              <Link to="/privacy" target="_blank">Privacy policy</Link>.
            </div>

            <Button type="submit" variant="primary" className="btn-block" loading={busy}>
              Submit request
            </Button>
          </form>
        </div>
      </Card>
    </div>
  );
}
