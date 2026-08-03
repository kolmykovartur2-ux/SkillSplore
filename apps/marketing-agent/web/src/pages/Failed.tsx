import { useApi } from '../lib/useApi.js';
import { Spinner, EmptyState } from '../components/ui.js';
import { DraftTable, type DraftRow } from '../components/DraftTable.js';

export function Failed() {
  const { data, loading } = useApi<{ drafts: DraftRow[] }>('/drafts?status=FAILED');
  return (
    <div className="page container">
      <h1>Failed</h1>
      {loading ? <Spinner /> : !data?.drafts.length ? <EmptyState title="No failures" /> : <DraftTable drafts={data.drafts} />}
    </div>
  );
}
