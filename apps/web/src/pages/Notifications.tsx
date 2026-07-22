import { Link } from 'react-router-dom';
import { api } from '../lib/api.js';
import { useApi } from '../lib/useApi.js';
import { Button, Card, EmptyState, Spinner } from '../components/ui.js';
import { timeAgo } from '../lib/format.js';

interface Notif { id: number; type: string; title: string; body: string | null; linkUrl: string | null; readAt: string | null; createdAt: string }

export function Notifications() {
  const { data, loading, reload } = useApi<{ notifications: Notif[] }>('/notifications');

  const markAll = async () => { await api.post('/notifications/read-all'); reload(); };

  if (loading) return <Spinner />;
  const notifs = data?.notifications ?? [];

  return (
    <div className="container-narrow" style={{ margin: '0 auto' }}>
      <div className="section-title"><h1 className="mt-0">Alerts</h1>{notifs.some((n) => !n.readAt) && <Button onClick={markAll}>Mark all read</Button>}</div>
      {notifs.length === 0 ? <EmptyState emoji="🔔" title="No notifications yet" /> : (
        <div className="stack-sm">
          {notifs.map((n) => {
            const body = (
              <Card key={n.id} className={n.readAt ? '' : ''}>
                <div className="card-body" style={{ padding: 14, borderLeft: n.readAt ? '3px solid transparent' : '3px solid var(--primary)' }}>
                  <div className="spread"><strong>{n.title}</strong><small>{timeAgo(n.createdAt)}</small></div>
                  {n.body && <div className="muted" style={{ fontSize: '0.9rem' }}>{n.body}</div>}
                </div>
              </Card>
            );
            return n.linkUrl ? <Link key={n.id} to={n.linkUrl} style={{ color: 'inherit' }}>{body}</Link> : body;
          })}
        </div>
      )}
    </div>
  );
}
