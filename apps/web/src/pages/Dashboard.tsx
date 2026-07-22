import { Link } from 'react-router-dom';
import { useAuth } from '../lib/auth.js';
import { useApi } from '../lib/useApi.js';
import { Alert, Card, Spinner, StatusBadge } from '../components/ui.js';

interface OwnProfile { status: string }

export function Dashboard() {
  const { user, hasRole } = useAuth();
  const { data: profileData, loading } = useApi<{ profile: OwnProfile | null }>('/tutors/me');
  const { data: saved } = useApi<{ tutors: unknown[] }>('/tutors/saved');
  const { data: reqs } = useApi<{ requests: unknown[] }>('/requests/mine');
  const { data: engs } = useApi<{ engagements: unknown[] }>('/engagements');

  if (!user) return null;
  const profile = profileData?.profile;

  return (
    <div className="stack">
      <h1>Welcome, {user.displayName.split(' ')[0]}</h1>
      {!user.emailVerified && (
        <Alert type="info">Your email isn’t confirmed yet. In the demo, open the mail capture inbox (Mailpit) to find your confirmation link.</Alert>
      )}

      <div className="grid grid-cards">
        <Card><div className="card-body">
          <h3 className="mt-0">Tutoring</h3>
          {loading ? <Spinner /> : profile ? (
            <>
              <p className="muted">Your tutor profile is <StatusBadge status={profile.status} />.</p>
              <Link className="btn btn-primary btn-sm" to="/tutor/onboarding">Manage tutor profile</Link>
            </>
          ) : (
            <>
              <p className="muted">Share your skills and earn by teaching.</p>
              <Link className="btn btn-primary btn-sm" to="/tutor/onboarding">Become a tutor</Link>
            </>
          )}
        </div></Card>

        <Card><div className="card-body">
          <h3 className="mt-0">My requests</h3>
          <p className="muted">{reqs ? `${reqs.requests.length} request(s)` : '—'}</p>
          <Link className="btn btn-sm" to="/requests">View requests</Link>{' '}
          <Link className="btn btn-primary btn-sm" to="/requests/new">Post a request</Link>
        </div></Card>

        <Card><div className="card-body">
          <h3 className="mt-0">Saved tutors</h3>
          <p className="muted">{saved ? `${saved.tutors.length} saved` : '—'}</p>
          <Link className="btn btn-sm" to="/search">Find tutors</Link>
        </div></Card>

        <Card><div className="card-body">
          <h3 className="mt-0">Engagements</h3>
          <p className="muted">{engs ? `${engs.engagements.length} arrangement(s)` : '—'}</p>
          <Link className="btn btn-sm" to="/engagements">View engagements</Link>
        </div></Card>

        <Card><div className="card-body">
          <h3 className="mt-0">Messages</h3>
          <p className="muted">Chat with tutors and students.</p>
          <Link className="btn btn-sm" to="/messages">Open messages</Link>
        </div></Card>

        {hasRole('TUTOR') && (
          <Card><div className="card-body">
            <h3 className="mt-0">Request feed</h3>
            <p className="muted">Find students looking for your subjects.</p>
            <Link className="btn btn-sm" to="/tutor/feed">Browse requests</Link>
          </div></Card>
        )}

        {hasRole('ADMIN') && (
          <Card><div className="card-body">
            <h3 className="mt-0">Administration</h3>
            <p className="muted">Approvals, moderation and platform tools.</p>
            <Link className="btn btn-primary btn-sm" to="/admin">Open admin</Link>
          </div></Card>
        )}
      </div>
    </div>
  );
}
