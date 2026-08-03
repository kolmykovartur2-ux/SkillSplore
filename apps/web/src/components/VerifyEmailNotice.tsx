import { useState } from 'react';
import { api, ApiError } from '../lib/api.js';
import { useAuth } from '../lib/auth.js';
import { useToast } from '../lib/toast.js';
import { Alert, Button } from './ui.js';

/**
 * Messaging is gated behind a confirmed email address on the server. Without
 * this, the first sign of that is a 403 after someone has already written out
 * a message, so it warns up front and offers a way to get a fresh link -- the
 * original one expires after 24 hours.
 *
 * Renders nothing when the account is already confirmed, so callers can drop it
 * in unconditionally.
 */
export function VerifyEmailNotice({ action = 'send messages' }: { action?: string }) {
  const { user, refresh } = useAuth();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  if (!user || user.emailVerified) return null;

  const resend = async () => {
    setBusy(true);
    try {
      await api.post('/auth/resend-verification');
      setSent(true);
      toast('Confirmation email sent. Check your inbox.', 'success');
      await refresh();
    } catch (e) {
      toast(e instanceof ApiError ? e.message : 'Could not send the email', 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Alert type="info">
      <div className="spread" style={{ gap: 12, flexWrap: 'wrap' }}>
        <span>Confirm your email address to {action}. We sent a link to <strong>{user.email}</strong>.</span>
        <Button className="btn-sm" loading={busy} disabled={sent} onClick={resend}>
          {sent ? 'Email sent' : 'Resend email'}
        </Button>
      </div>
    </Alert>
  );
}
