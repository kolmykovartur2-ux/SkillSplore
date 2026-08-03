import { useState } from 'react';
import { useApi } from '../lib/useApi.js';
import { Spinner, EmptyState, Select } from '../components/ui.js';
import { DraftTable, type DraftRow } from '../components/DraftTable.js';

const STATUSES = ['', 'IDEA', 'RESEARCHING', 'DRAFT', 'AWAITING_REVIEW', 'CHANGES_REQUESTED', 'APPROVED', 'SCHEDULED', 'PUBLISHING', 'PUBLISHED', 'FAILED', 'CANCELLED', 'ARCHIVED'];

export function Drafts() {
  const [status, setStatus] = useState('');
  const { data, loading } = useApi<{ drafts: DraftRow[] }>(`/drafts${status ? `?status=${status}` : ''}`);

  return (
    <div className="page container">
      <div className="section-title">
        <h1>Drafts</h1>
        <Select value={status} onChange={(e) => setStatus(e.target.value)} style={{ width: 220 }}>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s ? s.replace(/_/g, ' ').toLowerCase() : 'All statuses'}
            </option>
          ))}
        </Select>
      </div>
      {loading ? <Spinner /> : !data?.drafts.length ? <EmptyState title="No drafts">Generate one from a brief.</EmptyState> : <DraftTable drafts={data.drafts} />}
    </div>
  );
}
