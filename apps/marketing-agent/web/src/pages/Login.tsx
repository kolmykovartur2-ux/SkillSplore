import { useState, type FormEvent } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../lib/auth.js';
import { api, ApiError } from '../lib/api.js';
import { Button, Card, Field, Input, Alert } from '../components/ui.js';

export function Login() {
  const { user, setUser, config } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (user) return <Navigate to="/" replace />;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const admin = await api.post<{ id: number; email: string; displayName: string }>('/auth/login', { email, password });
      setUser(admin);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Login failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '80vh' }}>
      <Card className="stack" style={{ maxWidth: 380, width: '100%' }}>
        <div className="card-body stack">
          <div>
            <h1>SkillSplore Marketing</h1>
            <p className="muted">Internal LinkedIn content dashboard. {config?.appEnv !== 'production' ? `Running in ${config?.appEnv ?? '…'} mode.` : ''}</p>
          </div>
          {error && <Alert type="error">{error}</Alert>}
          <form onSubmit={submit} className="stack">
            <Field label="Email">
              <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoFocus />
            </Field>
            <Field label="Password">
              <Input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
            </Field>
            <Button type="submit" variant="primary" className="btn-block" loading={loading}>
              Log in
            </Button>
          </form>
        </div>
      </Card>
    </div>
  );
}
