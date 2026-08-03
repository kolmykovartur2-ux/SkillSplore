import { useState } from 'react';
import { useApi } from '../lib/useApi.js';
import { Card, Spinner, Select, Alert } from '../components/ui.js';
import { formatDate } from '../lib/format.js';

interface Row { id: number; capturedAt: string; impressions: number | null; reactions: number | null; comments: number | null; shares: number | null; clicks: number | null; isSimulated: boolean; publishedPost: { draft: { title: string | null; campaign?: { name: string } | null } } }
interface Summary { totals: { impressions: number; reactions: number; comments: number; shares: number; clicks: number }; rows: Row[]; allSimulated: boolean }

export function Analytics() {
  const [range, setRange] = useState<'week' | 'month'>('week');
  const { data, loading } = useApi<Summary>(`/analytics/summary?range=${range}`);

  return (
    <div className="page container">
      <div className="section-title">
        <h1>Analytics</h1>
        <Select value={range} onChange={(e) => setRange(e.target.value as 'week' | 'month')} style={{ width: 160 }}>
          <option value="week">Last 7 days</option>
          <option value="month">Last 30 days</option>
        </Select>
      </div>
      {loading || !data ? (
        <Spinner />
      ) : (
        <>
          {data.allSimulated && <Alert type="info">All figures below are simulated demo data (isSimulated), not real LinkedIn analytics.</Alert>}
          <div className="grid grid-cards" style={{ marginBottom: 20 }}>
            {Object.entries(data.totals).map(([k, v]) => (
              <Card key={k}>
                <div className="card-body">
                  <div className="muted">{k}</div>
                  <div className="num" style={{ fontSize: '1.6rem' }}>
                    {v}
                  </div>
                </div>
              </Card>
            ))}
          </div>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Post</th>
                  <th>Campaign</th>
                  <th>Captured</th>
                  <th>Impressions</th>
                  <th>Reactions</th>
                  <th>Comments</th>
                  <th>Shares</th>
                  <th>Clicks</th>
                </tr>
              </thead>
              <tbody>
                {data.rows.map((r) => (
                  <tr key={r.id}>
                    <td>{r.publishedPost.draft.title ?? '—'}</td>
                    <td>{r.publishedPost.draft.campaign?.name ?? '—'}</td>
                    <td>{formatDate(r.capturedAt)}</td>
                    <td>{r.impressions}</td>
                    <td>{r.reactions}</td>
                    <td>{r.comments}</td>
                    <td>{r.shares}</td>
                    <td>{r.clicks}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
