import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api.js';
import { Alert, Button, Card, Field, Input } from '../components/ui.js';

export function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try { await api.post('/auth/request-password-reset', { email }); } finally { setBusy(false); setSent(true); }
  };

  return (
    <div className="container-narrow" style={{ margin: '0 auto' }}>
      <Card>
        <div className="card-body">
          <h1>Reset your password</h1>
          {sent ? (
            <Alert type="success">If an account exists for that email, a reset link has been sent. In the demo, check the mail capture inbox.</Alert>
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
