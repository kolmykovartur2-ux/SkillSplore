import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, ApiError } from '../lib/api.js';
import { useApi } from '../lib/useApi.js';
import { useAuth } from '../lib/auth.js';
import { useToast } from '../lib/toast.js';
import { dateStr } from '../lib/format.js';
import type { SelfUser } from '../lib/types.js';
import { Avatar, Button, Card, Field, Input, Modal, Textarea } from '../components/ui.js';

export function Account() {
  const { user, setUser, refresh } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [displayName, setDisplayName] = useState(user?.displayName ?? '');
  const [bio, setBio] = useState(user?.bio ?? '');
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (!user) return null;

  const saveProfile = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const { user: updated } = await api.patch<{ user: SelfUser }>('/users/me', { displayName, bio });
      setUser(updated);
      toast('Profile updated', 'success');
    } catch (err) { toast(err instanceof ApiError ? err.message : 'Failed', 'error'); }
    finally { setBusy(false); }
  };

  const uploadAvatar = async (file: File) => {
    const fd = new FormData();
    fd.append('avatar', file);
    try {
      const { user: updated } = await api.post<{ user: SelfUser }>('/users/me/avatar', fd);
      setUser(updated);
      toast('Avatar updated', 'success');
    } catch (err) { toast(err instanceof ApiError ? err.message : 'Upload failed', 'error'); }
  };

  const deleteAccount = async () => {
    try {
      await api.del('/users/me');
      await refresh();
      toast('Your account has been deleted.');
      navigate('/');
    } catch (err) { toast(err instanceof ApiError ? err.message : 'Failed', 'error'); }
  };

  return (
    <div className="container-narrow" style={{ margin: '0 auto' }}>
      <h1>Account settings</h1>
      <Card><div className="card-body">
        <div className="row" style={{ marginBottom: 16 }}>
          <Avatar name={user.displayName} url={user.avatarUrl} size={64} />
          <label className="btn btn-sm">
            Change avatar
            <input type="file" accept="image/*" hidden onChange={(e) => e.target.files?.[0] && uploadAvatar(e.target.files[0])} />
          </label>
        </div>
        <form onSubmit={saveProfile}>
          <Field label="Full name"><Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} required /></Field>
          <Field label="Email"><Input value={user.email} disabled /></Field>
          <Field label="About you"><Textarea value={bio} onChange={(e) => setBio(e.target.value)} placeholder="A short bio…" /></Field>
          <Button type="submit" variant="primary" loading={busy}>Save changes</Button>
        </form>
      </div></Card>

      <BlockedPeople />

      <Card><div className="card-body">
        <h3 className="mt-0">Delete account</h3>
        <p className="muted">This removes your personal data. Your messages and reviews are anonymised to preserve others’ history.</p>
        <Button variant="danger" onClick={() => setConfirmDelete(true)}>Delete my account</Button>
      </div></Card>

      {confirmDelete && (
        <Modal title="Delete your account?" onClose={() => setConfirmDelete(false)}>
          <p>This cannot be undone. Are you sure?</p>
          <div className="row">
            <Button variant="danger" onClick={deleteAccount}>Yes, delete my account</Button>
            <Button onClick={() => setConfirmDelete(false)}>Cancel</Button>
          </div>
        </Modal>
      )}
    </div>
  );
}

interface BlockedPerson { id: number; displayName: string; avatarUrl: string | null; blockedAt: string }

// Blocking works both ways, so a block you can't undo also cuts you off from
// the other person permanently. This is the only place to review and reverse it.
function BlockedPeople() {
  const toast = useToast();
  const { data, loading, reload } = useApi<{ blocks: BlockedPerson[] }>('/conversations/blocks');
  const [busyId, setBusyId] = useState<number | null>(null);

  const unblock = async (person: BlockedPerson) => {
    setBusyId(person.id);
    try {
      await api.del(`/conversations/block/${person.id}`);
      toast(`Unblocked ${person.displayName}`, 'success');
      reload();
    } catch (e) {
      toast(e instanceof ApiError ? e.message : 'Could not unblock', 'error');
    } finally {
      setBusyId(null);
    }
  };

  if (loading) return null;
  const blocks = data?.blocks ?? [];

  return (
    <Card><div className="card-body">
      <h3 className="mt-0">Blocked people</h3>
      {blocks.length === 0 ? (
        <p className="muted">You haven’t blocked anyone. Blocking someone stops them messaging you, and stops you messaging them.</p>
      ) : (
        <>
          <p className="muted">Blocking works both ways. While someone is blocked, neither of you can message the other.</p>
          <div className="stack-sm">
            {blocks.map((b) => (
              <div key={b.id} className="spread" style={{ gap: 12 }}>
                <div className="row">
                  <Avatar name={b.displayName} url={b.avatarUrl} size={36} />
                  <div>
                    <strong>{b.displayName}</strong>
                    <div className="muted" style={{ fontSize: '0.82rem' }}>Blocked {dateStr(b.blockedAt)}</div>
                  </div>
                </div>
                <Button className="btn-sm" loading={busyId === b.id} onClick={() => unblock(b)}>Unblock</Button>
              </div>
            ))}
          </div>
        </>
      )}
    </div></Card>
  );
}
