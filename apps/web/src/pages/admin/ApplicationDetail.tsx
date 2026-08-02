import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api, ApiError } from '../../lib/api.js';
import { useApi } from '../../lib/useApi.js';
import { useToast } from '../../lib/toast.js';
import type { Money } from '../../lib/types.js';
import { AdminNav } from '../../components/AdminNav.js';
import { Badge, Button, Card, Field, Input, Select, Spinner, StatusBadge, Textarea } from '../../components/ui.js';
import { dateStr } from '../../lib/format.js';

interface AdminVerification {
  id: number; type: string; label: string; evidenceRef: string | null;
  checkedAt: string; expiresAt: string | null; revokedAt: string | null; revokedReason: string | null;
}
interface AdminTutor {
  id: number; status: string; headline: string | null; experience: string | null; teachingStyle: string | null; deliveryMode: string;
  country: string | null; city: string | null; hourlyRate: Money | null; changeRequestNote: string | null; submittedAt: string | null;
  user: { id: number; displayName: string; email: string };
  subjects: Array<{ name: string; price: Money | null }>; levels: string[];
  qualifications: Array<{ id: number; title: string; institution: string | null; year: number | null; hasDocument: boolean; documentUrl: string | null; verified: boolean }>;
  verifications: AdminVerification[];
}
interface Note { id: number; body: string; createdAt: string }

export function ApplicationDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { data, loading, reload } = useApi<{ tutor: AdminTutor }>(`/admin/tutors/${id}`);
  const { data: notesData, reload: reloadNotes } = useApi<{ notes: Note[] }>(`/admin/notes?entityType=TutorProfile&entityId=${id}`);
  const [note, setNote] = useState('');
  const [decisionNote, setDecisionNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [verType, setVerType] = useState('IDENTITY_DOCUMENT');
  const [verEvidence, setVerEvidence] = useState('');

  if (loading) return <><AdminNav /><Spinner /></>;
  const t = data!.tutor;

  const act = async (path: string, body: unknown, label: string) => {
    setBusy(true);
    try { await api.post(`/admin/tutors/${t.id}/${path}`, body); toast(label, 'success'); reload(); }
    catch (e) { toast(e instanceof ApiError ? e.message : 'Failed', 'error'); }
    finally { setBusy(false); }
  };

  const verify = async (qid: number) => {
    try { await api.post(`/admin/qualifications/${qid}/verify`); toast('Verified', 'success'); reload(); }
    catch (e) { toast(e instanceof ApiError ? e.message : 'Failed', 'error'); }
  };

  const addNote = async () => {
    try { await api.post('/admin/notes', { entityType: 'TutorProfile', entityId: t.id, body: note }); setNote(''); reloadNotes(); toast('Note added'); }
    catch (e) { toast(e instanceof ApiError ? e.message : 'Failed', 'error'); }
  };

  const addVerification = async () => {
    try {
      await api.post(`/admin/tutors/${t.id}/verifications`, { type: verType, evidenceRef: verEvidence || undefined });
      setVerEvidence(''); reload(); toast('Verification recorded', 'success');
    } catch (e) { toast(e instanceof ApiError ? e.message : 'Failed', 'error'); }
  };

  const revokeVerification = async (vid: number) => {
    const reason = window.prompt('Reason for revoking this verification:');
    if (!reason || reason.trim().length < 3) return;
    try { await api.post(`/admin/verifications/${vid}/revoke`, { reason }); reload(); toast('Verification revoked', 'success'); }
    catch (e) { toast(e instanceof ApiError ? e.message : 'Failed', 'error'); }
  };

  return (
    <div>
      <AdminNav />
      <div className="spread"><h1 className="mt-0">{t.user.displayName}</h1><StatusBadge status={t.status} /></div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 20, alignItems: 'start' }} className="profile-layout">
        <div className="stack">
          <Card><div className="card-body">
            <p className="muted">{t.user.email} · {t.city}, {t.country} · {t.deliveryMode}</p>
            <h3>{t.headline}</h3>
            <h4>Experience</h4><p style={{ whiteSpace: 'pre-wrap' }}>{t.experience}</p>
            <h4>Teaching style</h4><p style={{ whiteSpace: 'pre-wrap' }}>{t.teachingStyle}</p>
            <div className="row-wrap"><span className="muted">Levels:</span>{t.levels.map((l) => <Badge key={l}>{l}</Badge>)}</div>
          </div></Card>
          <Card><div className="card-body">
            <h3 className="mt-0">Subjects & rates</h3>
            <table className="table"><tbody>{t.subjects.map((s) => <tr key={s.name}><td>{s.name}</td><td style={{ textAlign: 'right' }}>{s.price?.display}/hr</td></tr>)}</tbody></table>
          </div></Card>
          <Card><div className="card-body">
            <h3 className="mt-0">Qualifications</h3>
            <ul className="list-reset stack-sm">
              {t.qualifications.map((q) => (
                <li key={q.id} className="spread">
                  <span>{q.title} <span className="muted">{[q.institution, q.year].filter(Boolean).join(', ')}</span></span>
                  <span className="row">
                    {q.documentUrl && <a className="btn btn-sm" href={q.documentUrl} target="_blank" rel="noreferrer">View document</a>}
                    {q.verified ? <Badge variant="success">Verified</Badge> : <Button className="btn-sm" onClick={() => verify(q.id)}>Mark verified</Button>}
                  </span>
                </li>
              ))}
              {t.qualifications.length === 0 && <li className="muted">No qualifications submitted.</li>}
            </ul>
          </div></Card>
          <Card><div className="card-body">
            <h3 className="mt-0">Verifications</h3>
            <p className="muted" style={{ marginTop: 0 }}>
              Every record is a specific, named check — never a generic "Verified" badge. Only
              active (non-revoked, non-expired) records show on the public profile.
            </p>
            <ul className="list-reset stack-sm">
              {t.verifications.map((v) => (
                <li key={v.id} className="spread" style={{ opacity: v.revokedAt ? 0.55 : 1 }}>
                  <span>
                    <strong>{v.label}</strong>{' '}
                    <span className="muted">
                      · checked {dateStr(v.checkedAt)}
                      {v.expiresAt && ` · expires ${dateStr(v.expiresAt)}`}
                      {v.evidenceRef && ` · ${v.evidenceRef}`}
                      {v.revokedAt && ` · revoked: ${v.revokedReason}`}
                    </span>
                  </span>
                  {!v.revokedAt && <Button className="btn-sm" variant="danger" onClick={() => revokeVerification(v.id)}>Revoke</Button>}
                </li>
              ))}
              {t.verifications.length === 0 && <li className="muted">No verifications recorded.</li>}
            </ul>
            <div className="divider" />
            <div className="row-wrap">
              <Select value={verType} onChange={(e) => setVerType(e.target.value)} style={{ width: 220 }}>
                <option value="IDENTITY_DOCUMENT">Identity checked</option>
                <option value="QUALIFICATION_DOCUMENT">Qualification document checked</option>
                <option value="EMAIL_CONFIRMED">Email confirmed</option>
              </Select>
              <Input placeholder="Evidence note (optional)" value={verEvidence} onChange={(e) => setVerEvidence(e.target.value)} style={{ flex: 1, minWidth: 160 }} />
              <Button onClick={addVerification}>Add verification</Button>
            </div>
          </div></Card>
          <Card><div className="card-body">
            <h3 className="mt-0">Internal notes</h3>
            <ul className="list-reset stack-sm">{notesData?.notes.map((n) => <li key={n.id} className="alert alert-info" style={{ margin: 0 }}>{n.body}</li>)}</ul>
            <Field label="Add a note"><Textarea value={note} onChange={(e) => setNote(e.target.value)} /></Field>
            <Button disabled={note.trim().length < 1} onClick={addNote}>Add note</Button>
          </div></Card>
        </div>
        <aside className="stack" style={{ position: 'sticky', top: 76 }}>
          <Card><div className="card-body stack">
            <h3 className="mt-0">Decision</h3>
            <Button variant="primary" className="btn-block" loading={busy} onClick={() => act('approve', {}, 'Tutor approved')}>Approve</Button>
            <Field label="Note (for changes/rejection)"><Textarea value={decisionNote} onChange={(e) => setDecisionNote(e.target.value)} /></Field>
            <Button className="btn-block" loading={busy} disabled={decisionNote.trim().length < 3} onClick={() => act('request-changes', { note: decisionNote }, 'Changes requested')}>Request changes</Button>
            <Button className="btn-block" loading={busy} onClick={() => act('reject', { note: decisionNote || undefined }, 'Application rejected')}>Reject</Button>
            <Button variant="danger" className="btn-block" loading={busy} onClick={() => act('suspend', { reason: decisionNote || undefined }, 'Tutor suspended')}>Suspend</Button>
            <Button className="btn-block" onClick={() => navigate('/admin/applications')}>Back to queue</Button>
          </div></Card>
        </aside>
      </div>
    </div>
  );
}
