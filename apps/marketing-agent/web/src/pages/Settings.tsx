import { useAuth } from '../lib/auth.js';
import { Card } from '../components/ui.js';

export function Settings() {
  const { config, user } = useAuth();
  return (
    <div className="page container">
      <h1>Settings</h1>
      <Card>
        <div className="card-body stack">
          <p>
            <strong>Signed in as:</strong> {user?.displayName} ({user?.email})
          </p>
          <p>
            <strong>Environment:</strong> {config?.appEnv}
          </p>
          <p>
            <strong>Default timezone:</strong> {config?.defaultTimezone}
          </p>
          <p>
            <strong>Content AI provider:</strong> {config?.contentAiProvider}
          </p>
          <p>
            <strong>LinkedIn mode:</strong> {config?.mockLinkedinApi ? 'mock (demo)' : 'real / draft-only — see the LinkedIn page'}
          </p>
          <p>
            <strong>Launch focus:</strong> {config?.launch.category} in {config?.launch.city}, {config?.launch.country} — {config?.launch.stage}
          </p>
          <p className="muted">
            All configuration is set via environment variables on this service (apps/marketing-agent/.env) — there is
            deliberately no in-app settings editor for launch focus, AI provider, or LinkedIn credentials, so secrets
            never pass through the browser or this database.
          </p>
        </div>
      </Card>
    </div>
  );
}
