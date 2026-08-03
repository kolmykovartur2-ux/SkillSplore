import { useApi } from '../lib/useApi.js';
import { Spinner, EmptyState } from '../components/ui.js';
import { DraftTable, type DraftRow } from '../components/DraftTable.js';

export function Published() {
  const { data, loading } = useApi<{ drafts: DraftRow[] }>('/drafts?status=PUBLISHED');
  return (
    <div className="page container">
      <h1>Published</h1>
      {loading ? <Spinner /> : !data?.drafts.length ? <EmptyState title="Nothing published yet" /> : <DraftTable drafts={data.drafts} />}
    </div>
  );
}
