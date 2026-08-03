import { useApi } from '../lib/useApi.js';
import { Spinner, EmptyState } from '../components/ui.js';
import { DraftTable, type DraftRow } from '../components/DraftTable.js';

export function ReviewQueue() {
  const { data, loading } = useApi<{ drafts: DraftRow[] }>('/drafts/review-queue');
  return (
    <div className="page container">
      <div className="section-title">
        <h1>Review queue</h1>
        <p className="muted">Awaiting review or with changes requested. Generate → review → edit → approve → schedule → publish.</p>
      </div>
      {loading ? <Spinner /> : !data?.drafts.length ? <EmptyState title="Nothing to review">The queue is empty.</EmptyState> : <DraftTable drafts={data.drafts} />}
    </div>
  );
}
