import { Link } from 'react-router-dom';
import { StatusBadge } from './ui.js';
import { formatDate } from '../lib/format.js';

export interface DraftRow {
  id: number;
  title?: string | null;
  body: string;
  status: string;
  contentType: string;
  generationProvider: string;
  scheduledFor?: string | null;
  publishedAt?: string | null;
  updatedAt?: string;
  campaign?: { name: string } | null;
  brief?: { pillar?: { name: string } | null } | null;
}

export function DraftTable({ drafts }: { drafts: DraftRow[] }) {
  return (
    <div className="table-wrap">
      <table className="table">
        <thead>
          <tr>
            <th>Draft</th>
            <th>Pillar</th>
            <th>Campaign</th>
            <th>Status</th>
            <th>Provider</th>
            <th>Scheduled / published</th>
          </tr>
        </thead>
        <tbody>
          {drafts.map((d) => (
            <tr key={d.id}>
              <td>
                <Link to={`/drafts/${d.id}`}>{d.title || d.body.slice(0, 60) + (d.body.length > 60 ? '…' : '')}</Link>
              </td>
              <td>{d.brief?.pillar?.name ?? '—'}</td>
              <td>{d.campaign?.name ?? '—'}</td>
              <td>
                <StatusBadge status={d.status} />
              </td>
              <td>{d.generationProvider}</td>
              <td>{formatDate(d.publishedAt ?? d.scheduledFor)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
