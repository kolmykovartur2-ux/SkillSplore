import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useApi } from '../lib/useApi.js';
import { api, ApiError } from '../lib/api.js';
import { useToast } from '../lib/toast.js';
import { useAuth } from '../lib/auth.js';
import { Badge, Button, Card, Spinner, StatusBadge, Textarea, Field, Input, Modal } from '../components/ui.js';
import { formatDate } from '../lib/format.js';

interface Version { id: number; versionNumber: number; content: string; editorType: string; changeSummary: string | null; createdAt: string }
interface Approval { id: number; action: string; notes: string | null; createdAt: string }
interface Attempt { id: number; attemptNumber: number; status: string; safeErrorMessage: string | null; attemptedAt: string }
interface Draft {
  id: number;
  title: string | null;
  body: string;
  status: string;
  contentType: string;
  destinationUrl: string | null;
  generationProvider: string;
  scheduledFor: string | null;
  publishedAt: string | null;
  brief: { maxLength: number; pillar?: { name: string } | null } | null;
  campaign: { name: string } | null;
  mediaAsset: { id: number; filename: string; isAiGenerated: boolean; personaKey: string | null } | null;
  versions: Version[];
  approvals: Approval[];
  schedule: { scheduledForUtc: string; timezoneAtScheduling: string } | null;
  publishedPost: { linkedinPostUrn: string; publishedUrl: string | null; analytics: { impressions: number; isSimulated: boolean }[] } | null;
  attempts: Attempt[];
}

export function DraftEditor() {
  const { id } = useParams();
  const { data, loading, reload } = useApi<{ draft: Draft }>(`/drafts/${id}`);
  const toast = useToast();
  const { config } = useAuth();
  const [body, setBody] = useState<string | null>(null);
  const [title, setTitle] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [showSchedule, setShowSchedule] = useState(false);
  const [showChanges, setShowChanges] = useState(false);
  const [changeNotes, setChangeNotes] = useState('');
  const [scheduleForm, setScheduleForm] = useState({ date: '', time: '12:00', override: false });

  if (loading) return <Spinner />;
  if (!data?.draft) return <p>Not found.</p>;
  const draft = data.draft;
  const currentBody = body ?? draft.body;
  const currentTitle = title ?? draft.title ?? '';

  const run = async (fn: () => Promise<unknown>, successMsg: string) => {
    setBusy(true);
    try {
      await fn();
      toast(successMsg, 'success');
      await reload();
    } catch (err) {
      toast(err instanceof ApiError ? err.message : 'Something went wrong.', 'error');
    } finally {
      setBusy(false);
    }
  };

  const evaluate = async () => {
    const res = await api.get<{ warnings: { message: string }[] }>(`/drafts/${draft.id}/evaluate`);
    setWarnings(res.warnings.map((w) => w.message));
  };

  // Persona and mood are derived from this draft's own words server-side, so
  // the founder gets contextual creative in one click rather than re-describing
  // the post on the Media page.
  const generateImage = () =>
    run(async () => {
      const res = await api.post<{ reapprovalRequired: boolean }>(`/drafts/${draft.id}/generate-image`, {});
      if (res.reapprovalRequired) toast('Image attached — this draft needs approving again.', 'success');
    }, 'Image generated and attached.');

  const save = () => run(() => api.patch(`/drafts/${draft.id}`, { body: currentBody, title: currentTitle || undefined }), 'Saved as a new version.');
  const approve = () => run(() => api.post(`/drafts/${draft.id}/approve`), 'Approved.');
  const requestChanges = () =>
    run(async () => {
      await api.post(`/drafts/${draft.id}/request-changes`, { notes: changeNotes });
      setShowChanges(false);
    }, 'Changes requested.');
  const duplicate = () => run(() => api.post(`/drafts/${draft.id}/duplicate`), 'Duplicated.');
  const cancel = () => run(() => api.post(`/drafts/${draft.id}/cancel`), 'Cancelled.');
  const archive = () => run(() => api.post(`/drafts/${draft.id}/archive`), 'Archived.');
  const unschedule = () => run(() => api.post(`/schedule/drafts/${draft.id}/unschedule`), 'Unscheduled.');
  const publishNow = () => run(() => api.post(`/schedule/drafts/${draft.id}/publish-now`), 'Publish attempted — check status below.');
  const retry = () => run(() => api.post(`/schedule/drafts/${draft.id}/retry`), 'Retry attempted.');

  const schedule = () =>
    run(async () => {
      const [year, month, day] = scheduleForm.date.split('-').map(Number);
      const [hour, minute] = scheduleForm.time.split(':').map(Number);
      await api.post(`/schedule/drafts/${draft.id}/schedule`, { year, month, day, hour, minute, override: scheduleForm.override });
      setShowSchedule(false);
    }, 'Scheduled.');

  return (
    <div className="page container">
      <div className="section-title">
        <div>
          <h1>Draft #{draft.id}</h1>
          <p className="muted">
            <StatusBadge status={draft.status} /> · {draft.brief?.pillar?.name ?? 'No pillar'} · {draft.campaign?.name ?? 'No campaign'} · generated by {draft.generationProvider}
          </p>
        </div>
        <div className="row-wrap">
          <Button onClick={() => void evaluate()} disabled={busy}>
            Check warnings
          </Button>
          <Button onClick={() => void duplicate()} disabled={busy}>
            Duplicate
          </Button>
          {['IDEA', 'RESEARCHING', 'DRAFT', 'AWAITING_REVIEW', 'CHANGES_REQUESTED', 'APPROVED', 'SCHEDULED'].includes(
            draft.status,
          ) && (
            <Button onClick={() => void generateImage()} loading={busy}>
              {draft.mediaAsset ? 'Regenerate image' : 'Generate image'}
            </Button>
          )}
        </div>
      </div>

      {draft.mediaAsset && (
        <Card style={{ marginBottom: 16 }}>
          <div className="card-body">
            <div className="row-wrap" style={{ alignItems: 'center', gap: 8 }}>
              <h3 style={{ margin: 0 }}>Attached image</h3>
              {draft.mediaAsset.isAiGenerated && (
                <Badge variant="warning" title="Synthetic image — depicts no real person">
                  AI-generated
                </Badge>
              )}
            </div>
            <p className="muted" style={{ marginBottom: 0 }}>
              {draft.mediaAsset.filename}
              {draft.mediaAsset.personaKey ? ` · audience: ${draft.mediaAsset.personaKey}` : ''}
            </p>
            <p className="muted">Check the image before approving — models occasionally add text or stray details.</p>
          </div>
        </Card>
      )}

      {warnings && (
        <Card style={{ marginBottom: 16 }}>
          <div className="card-body">
            <h3>Warnings</h3>
            {warnings.length === 0 ? <p className="muted">No warnings.</p> : <ul className="warn-list">{warnings.map((w, i) => <li key={i}>{w}</li>)}</ul>}
          </div>
        </Card>
      )}

      <div className="grid grid-2">
        <Card>
          <div className="card-body stack">
            <Field label="Title">
              <Input value={currentTitle} onChange={(e) => setTitle(e.target.value)} />
            </Field>
            <Field label={`Body (${currentBody.length}${draft.brief ? ` / ${draft.brief.maxLength}` : ''} characters)`}>
              <Textarea value={currentBody} onChange={(e) => setBody(e.target.value)} rows={14} />
            </Field>
            <div className="row-wrap">
              <Button variant="primary" onClick={save} loading={busy} disabled={currentBody === draft.body && currentTitle === (draft.title ?? '')}>
                Save edit (new version)
              </Button>
              {['AWAITING_REVIEW', 'CHANGES_REQUESTED'].includes(draft.status) && (
                <Button variant="accent" onClick={approve} loading={busy}>
                  Approve
                </Button>
              )}
              {['AWAITING_REVIEW', 'APPROVED', 'SCHEDULED'].includes(draft.status) && (
                <Button onClick={() => setShowChanges(true)} disabled={busy}>
                  Request changes
                </Button>
              )}
              {draft.status === 'APPROVED' && (
                <Button variant="accent" onClick={() => setShowSchedule(true)} disabled={busy}>
                  Schedule
                </Button>
              )}
              {draft.status === 'SCHEDULED' && (
                <>
                  <Button onClick={unschedule} disabled={busy}>
                    Unschedule
                  </Button>
                  <Button variant="primary" onClick={publishNow} loading={busy}>
                    Publish now
                  </Button>
                </>
              )}
              {draft.status === 'FAILED' && (
                <Button variant="primary" onClick={retry} loading={busy}>
                  Retry
                </Button>
              )}
              {!['PUBLISHED', 'PUBLISHING', 'CANCELLED', 'ARCHIVED'].includes(draft.status) && (
                <Button variant="danger" onClick={cancel} disabled={busy}>
                  Cancel
                </Button>
              )}
              {['PUBLISHED', 'CANCELLED', 'FAILED'].includes(draft.status) && (
                <Button onClick={archive} disabled={busy}>
                  Archive
                </Button>
              )}
              <Button
                onClick={() => {
                  void navigator.clipboard.writeText(currentBody);
                  toast('Copied to clipboard.', 'success');
                }}
              >
                Copy to clipboard
              </Button>
            </div>
          </div>
        </Card>

        <div className="stack">
          {draft.schedule && (
            <Card>
              <div className="card-body">
                <h3>Schedule</h3>
                <p>
                  {formatDate(draft.schedule.scheduledForUtc)} ({draft.schedule.timezoneAtScheduling})
                </p>
              </div>
            </Card>
          )}
          {draft.publishedPost && (
            <Card>
              <div className="card-body">
                <h3>Published</h3>
                <p>
                  URN: <code>{draft.publishedPost.linkedinPostUrn}</code>
                </p>
                {draft.publishedPost.publishedUrl && (
                  <p>
                    <a href={draft.publishedPost.publishedUrl} target="_blank" rel="noreferrer">
                      View on LinkedIn
                    </a>
                  </p>
                )}
                {draft.publishedPost.analytics[0] && (
                  <p className="muted">
                    Impressions: {draft.publishedPost.analytics[0].impressions}
                    {draft.publishedPost.analytics[0].isSimulated && ' (simulated demo data)'}
                  </p>
                )}
              </div>
            </Card>
          )}
          {draft.attempts.length > 0 && (
            <Card>
              <div className="card-body">
                <h3>Publication attempts</h3>
                <ul className="list-reset stack-sm">
                  {draft.attempts.map((a) => (
                    <li key={a.id}>
                      #{a.attemptNumber} — {a.status} — {formatDate(a.attemptedAt)}
                      {a.safeErrorMessage && <div className="muted">{a.safeErrorMessage}</div>}
                    </li>
                  ))}
                </ul>
              </div>
            </Card>
          )}
          <Card>
            <div className="card-body">
              <h3>Version history</h3>
              <ul className="list-reset stack-sm">
                {draft.versions.map((v) => (
                  <li key={v.id}>
                    <strong>v{v.versionNumber}</strong> ({v.editorType.toLowerCase()}) — {formatDate(v.createdAt)}
                    {v.changeSummary && <div className="muted">{v.changeSummary}</div>}
                  </li>
                ))}
              </ul>
            </div>
          </Card>
          {draft.approvals.length > 0 && (
            <Card>
              <div className="card-body">
                <h3>Approval history</h3>
                <ul className="list-reset stack-sm">
                  {draft.approvals.map((a) => (
                    <li key={a.id}>
                      {a.action.replace(/_/g, ' ').toLowerCase()} — {formatDate(a.createdAt)}
                      {a.notes && <div className="muted">{a.notes}</div>}
                    </li>
                  ))}
                </ul>
              </div>
            </Card>
          )}
        </div>
      </div>

      {showSchedule && (
        <Modal title="Schedule this post" onClose={() => setShowSchedule(false)}>
          <div className="stack">
            <Field label={`Date and time (in ${config?.defaultTimezone ?? 'the configured timezone'})`}>
              <div className="row">
                <Input type="date" value={scheduleForm.date} onChange={(e) => setScheduleForm({ ...scheduleForm, date: e.target.value })} />
                <Input type="time" value={scheduleForm.time} onChange={(e) => setScheduleForm({ ...scheduleForm, time: e.target.value })} />
              </div>
            </Field>
            <label className="check">
              <input type="checkbox" checked={scheduleForm.override} onChange={(e) => setScheduleForm({ ...scheduleForm, override: e.target.checked })} />
              Override cadence conflicts (more than 1/day or under 18h apart)
            </label>
            <Button variant="primary" onClick={schedule} disabled={!scheduleForm.date} loading={busy}>
              Schedule
            </Button>
          </div>
        </Modal>
      )}

      {showChanges && (
        <Modal title="Request changes" onClose={() => setShowChanges(false)}>
          <div className="stack">
            <Field label="Notes for the next revision">
              <Textarea value={changeNotes} onChange={(e) => setChangeNotes(e.target.value)} />
            </Field>
            <Button variant="primary" onClick={requestChanges} disabled={!changeNotes} loading={busy}>
              Request changes
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
}
