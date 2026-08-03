import { useApi } from '../lib/useApi.js';
import { api, ApiError } from '../lib/api.js';
import { useToast } from '../lib/toast.js';
import { Button, Card, Spinner, Badge, Alert } from '../components/ui.js';

interface Status {
  mode: 'demo_mock' | 'real' | 'draft_only';
  connected: boolean;
  organizationName?: string;
  publishingEnabled: boolean;
  realClientConfigured: boolean;
}

export function LinkedInConnection() {
  const { data, loading, reload } = useApi<Status>('/linkedin/status');
  const toast = useToast();

  const disconnect = async () => {
    try {
      await api.post('/linkedin/disconnect');
      toast('Disconnected. Historical published-post records are preserved.', 'success');
      await reload();
    } catch (err) {
      toast(err instanceof ApiError ? err.message : 'Failed to disconnect.', 'error');
    }
  };

  if (loading || !data) return <Spinner />;

  return (
    <div className="page container">
      <h1>LinkedIn connection</h1>
      <Card>
        <div className="card-body stack">
          {data.mode === 'demo_mock' && (
            <Alert type="info">Demo mode: publishing is simulated against a fake organization. No real LinkedIn account is involved.</Alert>
          )}
          {data.mode === 'draft_only' && (
            <Alert type="info">Draft-only mode: no LinkedIn connection. Every workflow up to approval and scheduling still works — publishing will wait until you connect.</Alert>
          )}
          <p>
            Status: <Badge variant={data.connected ? 'success' : ''}>{data.connected ? 'connected' : 'not connected'}</Badge>
          </p>
          {data.organizationName && <p>Organization: {data.organizationName}</p>}
          <p className="muted">
            Real publishing enabled: {String(data.publishingEnabled)} · Client credentials configured: {String(data.realClientConfigured)}
          </p>
          <div className="row-wrap">
            {!data.connected && data.mode !== 'demo_mock' && (
              <a className="btn btn-primary" href="/api/linkedin/oauth/start">
                Connect LinkedIn
              </a>
            )}
            {data.connected && data.mode !== 'demo_mock' && (
              <Button variant="danger" onClick={() => void disconnect()}>
                Disconnect
              </Button>
            )}
          </div>
          {!data.realClientConfigured && data.mode !== 'demo_mock' && (
            <p className="muted">
              To connect for real, set LINKEDIN_CLIENT_ID / LINKEDIN_CLIENT_SECRET / LINKEDIN_REDIRECT_URI /
              LINKEDIN_PUBLISHING_ENABLED=true in this service's own .env — see docs/marketing-agent/LINKEDIN_SETUP.md.
            </p>
          )}
        </div>
      </Card>
    </div>
  );
}
