import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api.js';
import { Alert, Button, Card, Field, Input } from '../components/ui.js';

export function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  // Deployment-wide, not per-account, so showing it leaks nothing about
  // whether this address is registered.
  const [mailConfigured, setMailConfigured] = useState(true);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await api.post<{ mailConfigured?: boolean }>('/auth/request-password-reset', { email });
      setMailConfigured(res.mailConfigured !== false);
    } finally { setBusy(false); setSent(true); }
  };

  return (
    <div className="container-narrow" style={{ margin: '0 auto' }}>
      <Card>
        <div className="card-body">
          <h1>Reset your password</h1>
          {sent ? (
            mailConfigured ? (
              <Alert type="success">
                If an account exists for that email, a reset link has been sent. It is valid for one hour.
              </Alert>
            ) : (
              /* Without this the page claims a link was sent, and someone
                 locked out of their account waits for a message that cannot
                 arrive. */
              <Alert type="error">
                <strong>Password reset is currently unavailable.</strong> This site cannot send email
                at the moment, so no reset link can reach you. Please contact{' '}
                <a href="mailto:admin@skillsplore.org">admin@skillsplore.org</a> and we will help you
                back into your account.
              </Alert>
            )
          ) : (
            <form onSubmit={submit}>
              <Field label="Email"><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></Field>
              <Button type="submit" variant="primary" className="btn-block" loading={busy}>Send reset link</Button>
            </form>
          )}
          <p className="muted" style={{ marginTop: 12 }}><Link to="/login">Back to login</Link></p>
        </div>
      </Card>
    </div>
  );
}
