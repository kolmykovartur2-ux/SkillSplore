import { useState } from 'react';
import { api, ApiError } from '../lib/api.js';
import { useAuth } from '../lib/auth.js';
import { useToast } from '../lib/toast.js';
import { Button, Field, Modal, Select, Textarea } from './ui.js';

export type ReportEntityType = 'TUTOR_PROFILE' | 'REQUEST' | 'MESSAGE' | 'REVIEW' | 'USER';

/**
 * One reporting control for every entity the moderation backend accepts. The
 * frontend previously only ever reported profiles and messages, so requests,
 * reviews and accounts were unreportable despite full server support -- a real
 * gap under a "moderated noticeboard" positioning.
 *
 * Renders nothing when signed out, since reports are attributed to an account.
 */
export function ReportButton({
  entityType,
  entityId,
  label = 'Report',
  what = 'this',
  className = 'btn-sm',
}: {
  entityType: ReportEntityType;
  entityId: number;
  label?: string;
  what?: string;
  className?: string;
}) {
  const { user } = useAuth();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [details, setDetails] = useState('');
  const [busy, setBusy] = useState(false);

  if (!user) return null;

  const submit = async () => {
    setBusy(true);
    try {
      await api.post('/reports', {
        entityType,
        entityId,
        reason,
        details: details.trim() || undefined,
      });
      toast('Report submitted. Our team will review it.', 'success');
      setOpen(false);
      setReason('');
      setDetails('');
    } catch (e) {
      toast(e instanceof ApiError ? e.message : 'Could not submit the report', 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Button className={className} onClick={() => setOpen(true)}>{label}</Button>
      {open && (
        <Modal title={`Report ${what}`} onClose={() => setOpen(false)}>
          <Field label="Reason">
            <Select value={reason} onChange={(e) => setReason(e.target.value)}>
              <option value="">Choose a reason…</option>
              {REASONS.map((r) => <option key={r} value={r}>{r}</option>)}
            </Select>
          </Field>
          <Field label="Anything else we should know? (optional)">
            <Textarea
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="Add any detail that would help us review this."
              rows={4}
            />
          </Field>
          <p className="muted" style={{ fontSize: '0.82rem' }}>
            Reports go to the SkillSplore team. We may remove content that breaks the platform rules.
          </p>
          <div className="row">
            <Button variant="danger" loading={busy} disabled={!reason} onClick={submit}>Submit report</Button>
            <Button onClick={() => setOpen(false)}>Cancel</Button>
          </div>
        </Modal>
      )}
    </>
  );
}

// Kept short and general so the same list reads sensibly for a profile, a
// request, a review, a message or an account. Free-text detail carries the rest.
const REASONS = [
  'Spam or advertising',
  'Misleading or false information',
  'Offensive or abusive content',
  'Harassment or bullying',
  'Scam or fraudulent activity',
  'Inappropriate for a learning platform',
  'Safeguarding concern',
  'Something else',
];
