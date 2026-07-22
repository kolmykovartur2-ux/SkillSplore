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
  const [form, setForm] = useState({ displayName: '', email: '', password: '', acceptTerms: false });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true); setError(null);
    try {
      const { user } = await api.post<{ user: SelfUser }>('/auth/register', form);
      setUser(user);
      toast('Account created. Check the mail capture inbox to confirm your email.', 'success');
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
          <p className="muted">One account lets you learn as a student and, if you like, teach as a tutor.</p>
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
            <label className="check" style={{ marginBottom: 14 }}>
              <input type="checkbox" checked={form.acceptTerms} onChange={(e) => setForm({ ...form, acceptTerms: e.target.checked })} required />
              <span>I accept the <Link to="/">terms of service</Link> and <Link to="/">privacy policy</Link>.</span>
            </label>
            <Button type="submit" variant="primary" className="btn-block" loading={busy}>Create account</Button>
          </form>
          <p className="muted" style={{ marginTop: 12 }}>Already have an account? <Link to="/login">Log in</Link></p>
        </div>
      </Card>
    </div>
  );
}
