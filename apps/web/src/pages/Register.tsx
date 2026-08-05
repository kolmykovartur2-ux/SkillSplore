import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, ApiError } from '../lib/api.js';
import { useAuth } from '../lib/auth.js';
import type { SelfUser } from '../lib/types.js';
import { useToast } from '../lib/toast.js';
import { Alert, Button, Card, Field, Input } from '../components/ui.js';

export function Register() {
  const { setUser } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  // Every consent field starts false. `marketingOptIn` in particular is
  // separate from acceptTerms and is never pre-ticked -- bundling it into
  // account creation is what makes marketing consent invalid.
  const [form, setForm] = useState({
    displayName: '',
    email: '',
    password: '',
    acceptTerms: false,
    confirmAdult: false,
    marketingOptIn: false,
  });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true); setError(null);
    try {
      const { user, emailDelivered } = await api.post<{ user: SelfUser; emailDelivered: boolean }>(
        '/auth/register',
        form,
      );
      setUser(user);
      // Do not tell someone to check an inbox when the message was never sent.
      // Confirming an address is what unlocks messaging, so silently failing
      // here leaves the account unable to do the main thing the site is for.
      if (emailDelivered) {
        toast('Account created. Check your email to confirm your address.', 'success');
      } else {
        toast(
          'Account created, but we could not send your confirmation email. '
          + 'Contact admin@skillsplore.org and we will confirm your address manually.',
          'error',
        );
      }
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Registration failed.');
    } finally { setBusy(false); }
  };

  return (
    <div className="container-narrow" style={{ margin: '0 auto' }}>
      <Card>
        <div className="card-body">
          <h1>Create your account</h1>
          <p className="muted">One account lets you learn from others and, if you like, teach what you know.</p>
          {error && <Alert type="error">{error}</Alert>}
          <form onSubmit={submit}>
            <Field label="Full name">
              <Input value={form.displayName} onChange={(e) => setForm({ ...form, displayName: e.target.value })} required minLength={2} />
            </Field>
            <Field label="Email">
              <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required autoComplete="email" />
            </Field>
            <Field label="Password" hint="At least 10 characters, with letters and numbers.">
              <Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required autoComplete="new-password" />
            </Field>
            {/* Contextual privacy notice — what is collected here and why,
                shown at the point of collection rather than only in the
                policy. */}
            <div className="alert alert-info" style={{ marginBottom: 14, fontSize: '0.9rem' }}>
              <strong>What we collect here:</strong> your name, email and a secure hash of your
              password — never the password itself. We use them to create and secure your account
              and to send essential messages such as email verification. Your name may be shown
              publicly if you publish a profile; your email address is not.{' '}
              <Link to="/privacy" target="_blank">Read the privacy policy</Link>.
            </div>

            <label className="check" style={{ marginBottom: 10 }}>
              <input type="checkbox" checked={form.confirmAdult} onChange={(e) => setForm({ ...form, confirmAdult: e.target.checked })} required />
              <span>
                I am 18 or over. <span className="muted">If you are arranging learning for a
                child, use your own account and stay responsible for it.</span>
              </span>
            </label>

            <label className="check" style={{ marginBottom: 10 }}>
              <input type="checkbox" checked={form.acceptTerms} onChange={(e) => setForm({ ...form, acceptTerms: e.target.checked })} required />
              <span>I accept the <Link to="/terms" target="_blank">terms of use</Link> and <Link to="/privacy" target="_blank">privacy policy</Link>.</span>
            </label>

            {/* Optional and clearly marked as such. No `required`. */}
            <label className="check" style={{ marginBottom: 14 }}>
              <input type="checkbox" checked={form.marketingOptIn} onChange={(e) => setForm({ ...form, marketingOptIn: e.target.checked })} />
              <span>
                <span className="muted">Optional.</span> Email me occasional product updates and
                tips. You do not need this to use SkillSplore, and you can unsubscribe at any time.
              </span>
            </label>

            <Button type="submit" variant="primary" className="btn-block" loading={busy}>Create account</Button>
          </form>
          <p className="muted" style={{ marginTop: 12 }}>Already have an account? <Link to="/login">Log in</Link></p>
        </div>
      </Card>
    </div>
  );
}
