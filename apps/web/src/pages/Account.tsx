import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, ApiError } from '../lib/api.js';
import { useAuth } from '../lib/auth.js';
import { useToast } from '../lib/toast.js';
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
