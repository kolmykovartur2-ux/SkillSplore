import { useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api, ApiError } from '../lib/api.js';
import { Alert, Button, Card, Field, Input } from '../components/ui.js';

export function ResetPassword() {
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const [password, setPassword] = useState('');
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true); setError(null);
    try { await api.post('/auth/reset-password', { token, password }); setDone(true); }
    catch (err) { setError(err instanceof ApiError ? err.message : 'Reset failed.'); }
    finally { setBusy(false); }
  };

  return (
    <div className="container-narrow" style={{ margin: '0 auto' }}>
      <Card>
        <div className="card-body">
          <h1>Choose a new password</h1>
          {!token && <Alert type="error">This reset link is missing its token.</Alert>}
          {error && <Alert type="error">{error}</Alert>}
          {done ? (
            <><Alert type="success">Your password has been reset.</Alert><Link className="btn btn-primary" to="/login">Log in</Link></>
          ) : (
            <form onSubmit={submit}>
              <Field label="New password" hint="At least 10 characters, with letters and numbers.">
                <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="new-password" />
              </Field>
              <Button type="submit" variant="primary" className="btn-block" loading={busy} disabled={!token}>Reset password</Button>
            </form>
          )}
        </div>
      </Card>
    </div>
  );
}
