import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api, ApiError } from '../lib/api.js';
import { useAuth } from '../lib/auth.js';
import { Card, Spinner } from '../components/ui.js';

export function VerifyEmail() {
  const [params] = useSearchParams();
  const { refresh } = useAuth();
  const token = params.get('token');
  const [state, setState] = useState<'loading' | 'ok' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) { setState('error'); setMessage('No confirmation token provided.'); return; }
    api.post('/auth/verify-email', { token })
      .then(async () => { setState('ok'); await refresh().catch(() => undefined); })
      .catch((err) => { setState('error'); setMessage(err instanceof ApiError ? err.message : 'Verification failed.'); });
  }, [token]);

  return (
    <div className="container-narrow" style={{ margin: '0 auto' }}>
      <Card>
        <div className="card-body center">
          {state === 'loading' && <Spinner />}
          {state === 'ok' && (<><h1>Email confirmed ✅</h1><p className="muted">Thanks — your email address is verified.</p><Link className="btn btn-primary" to="/dashboard">Go to dashboard</Link></>)}
          {state === 'error' && (<><h1>Confirmation failed</h1><p className="muted">{message}</p><Link className="btn" to="/dashboard">Back to dashboard</Link></>)}
        </div>
      </Card>
    </div>
  );
}
