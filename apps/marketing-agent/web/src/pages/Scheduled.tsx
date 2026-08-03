import { useApi } from '../lib/useApi.js';
import { Spinner, EmptyState } from '../components/ui.js';
import { DraftTable, type DraftRow } from '../components/DraftTable.js';

export function Scheduled() {
  const { data, loading } = useApi<{ drafts: DraftRow[] }>('/drafts?status=SCHEDULED');
  return (
    <div className="page container">
      <h1>Scheduled</h1>
      {loading ? <Spinner /> : !data?.drafts.length ? <EmptyState title="Nothing scheduled">Approve a draft, then schedule it from the Calendar or the draft page.</EmptyState> : <DraftTable drafts={data.drafts} />}
    </div>
  );
}
