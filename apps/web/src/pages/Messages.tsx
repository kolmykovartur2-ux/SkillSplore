import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api, ApiError } from '../lib/api.js';
import { useApi } from '../lib/useApi.js';
import { useAuth } from '../lib/auth.js';
import { useToast } from '../lib/toast.js';
import type { PublicUser } from '../lib/types.js';
import { Avatar, Button, Card, EmptyState, Field, Input, Modal, Spinner } from '../components/ui.js';
import { VerifyEmailNotice } from '../components/VerifyEmailNotice.js';
import { ReportButton } from '../components/ReportButton.js';
import { dateTime, timeAgo } from '../lib/format.js';

interface ConvSummary { id: number; context: string; lastMessageAt: string; otherParticipant: PublicUser | null; lastMessage: { body: string; createdAt: string } | null; unreadCount: number }
interface Msg { id: number; senderId: number; mine: boolean; body: string; hidden: boolean; createdAt: string }
interface ConvDetail { id: number; context: string; otherParticipant: PublicUser | null; messages: Msg[] }

export function Messages() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: listData, loading, reload } = useApi<{ conversations: ConvSummary[] }>('/conversations');

  return (
    <div style={{ display: 'grid', gridTemplateColumns: id ? '320px 1fr' : '1fr', gap: 20, alignItems: 'start' }} className="messages-layout">
      <div className={id ? 'conv-list-hide-mobile' : ''}>
        <h2 className="mt-0">Messages</h2>
        {loading ? <Spinner /> : (listData?.conversations.length ?? 0) === 0 ? (
          <EmptyState emoji="💬" title="No conversations yet">Message someone from their profile to get started.</EmptyState>
        ) : (
          <div className="stack-sm">
            {listData!.conversations.map((c) => (
              <Card key={c.id} className={String(c.id) === id ? '' : ''}>
                <Link to={`/messages/${c.id}`} style={{ color: 'inherit', display: 'block' }}>
                  <div className="card-body" style={{ padding: 12, background: String(c.id) === id ? 'var(--primary-soft)' : undefined, borderRadius: 'var(--radius)' }}>
                    <div className="row">
                      <Avatar name={c.otherParticipant?.displayName ?? '?'} url={c.otherParticipant?.avatarUrl} size={40} />
                      <div className="grow">
                        <div className="spread"><strong>{c.otherParticipant?.displayName ?? 'Conversation'}</strong>{c.unreadCount > 0 && <span className="nav-badge">{c.unreadCount}</span>}</div>
                        <div className="muted" style={{ fontSize: '0.82rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 200 }}>{c.lastMessage?.body ?? 'No messages'}</div>
                      </div>
                    </div>
                  </div>
                </Link>
              </Card>
            ))}
          </div>
        )}
      </div>
      {id && <Thread conversationId={Number(id)} onChanged={reload} onBack={() => navigate('/messages')} />}
    </div>
  );
}

function Thread({ conversationId, onChanged, onBack }: { conversationId: number; onChanged: () => void; onBack: () => void }) {
  const { user } = useAuth();
  const toast = useToast();
  const [conv, setConv] = useState<ConvDetail | null>(null);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [arrangeOpen, setArrangeOpen] = useState(false);
  const [arrangeTitle, setArrangeTitle] = useState('');
  const [confirmBlock, setConfirmBlock] = useState(false);
  const canSend = !!user?.emailVerified;
  const bottomRef = useRef<HTMLDivElement>(null);

  const load = async () => {
    try { setConv((await api.get<{ conversation: ConvDetail }>(`/conversations/${conversationId}`)).conversation); }
    catch { /* ignore */ }
  };

  useEffect(() => {
    setConv(null);
    load();
    const t = setInterval(load, 5000); // polling keeps the thread live without a proprietary realtime service
    return () => clearInterval(t);
  }, [conversationId]);

  useEffect(() => { bottomRef.current?.scrollIntoView(); }, [conv?.messages.length]);

  const send = async (e: FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    setBusy(true);
    try {
      await api.post(`/conversations/${conversationId}/messages`, { body: text });
      setText('');
      await load();
      onChanged();
    } catch (err) { toast(err instanceof ApiError ? err.message : 'Failed to send', 'error'); }
    finally { setBusy(false); }
  };

  const recordArrangement = async () => {
    setBusy(true);
    try {
      await api.post('/engagements', { conversationId, title: arrangeTitle });
      toast('Arrangement recorded', 'success');
      setArrangeOpen(false); setArrangeTitle('');
    } catch (err) { toast(err instanceof ApiError ? err.message : 'Failed', 'error'); }
    finally { setBusy(false); }
  };

  const block = async () => {
    if (!conv?.otherParticipant) return;
    setBusy(true);
    try {
      await api.post('/conversations/block', { userId: conv.otherParticipant.id });
      toast(`${conv.otherParticipant.displayName} blocked. You can undo this in Account settings.`, 'success');
      setConfirmBlock(false);
    }
    catch (err) { toast(err instanceof ApiError ? err.message : 'Failed', 'error'); }
    finally { setBusy(false); }
  };

  const archive = async () => {
    try { await api.post(`/conversations/${conversationId}/archive`); toast('Archived'); onChanged(); onBack(); }
    catch (err) { toast(err instanceof ApiError ? err.message : 'Failed', 'error'); }
  };

  const reportMessage = async (messageId: number) => {
    try { await api.post('/reports', { entityType: 'MESSAGE', entityId: messageId, reason: 'Reported from chat' }); toast('Message reported', 'success'); }
    catch (err) { toast(err instanceof ApiError ? err.message : 'Failed', 'error'); }
  };

  if (!conv) return <Card><div className="card-body"><Spinner /></div></Card>;

  return (
    <Card>
      <div className="card-body" style={{ padding: 0 }}>
        <div className="spread" style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
          <div className="row">
            <button className="btn btn-ghost btn-sm conv-back-mobile" onClick={onBack}>←</button>
            <Avatar name={conv.otherParticipant?.displayName ?? '?'} url={conv.otherParticipant?.avatarUrl} size={36} />
            <strong>{conv.otherParticipant?.displayName ?? 'Conversation'}</strong>
          </div>
          <div className="row">
            <Button className="btn-sm" onClick={() => setArrangeOpen(true)}>Record arrangement</Button>
            <Button className="btn-sm" onClick={archive}>Archive</Button>
            {conv.otherParticipant && (
              <ReportButton entityType="USER" entityId={conv.otherParticipant.id} label="Report" what="this person" />
            )}
            <Button className="btn-sm" onClick={() => setConfirmBlock(true)}>Block</Button>
          </div>
        </div>

        <div className="chat-thread">
          {conv.messages.map((m) => (
            <div key={m.id} className={`bubble ${m.mine ? 'mine' : ''}`} title={dateTime(m.createdAt)}>
              {m.body}
              <span className="time">
                {timeAgo(m.createdAt)}
                {!m.mine && !m.hidden && (
                  <>
                    {' · '}
                    <button
                      type="button"
                      style={{ color: 'inherit', textDecoration: 'underline', background: 'none', border: 'none', padding: 0, font: 'inherit', cursor: 'pointer' }}
                      onClick={() => reportMessage(m.id)}
                    >
                      report
                    </button>
                  </>
                )}
              </span>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        <div style={{ padding: '0 12px' }}><VerifyEmailNotice /></div>
        <form onSubmit={send} className="row" style={{ padding: 12, borderTop: '1px solid var(--border)' }}>
          <input
            className="input"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={canSend ? 'Type a message…' : 'Confirm your email to send messages'}
            disabled={!canSend}
          />
          <Button type="submit" variant="primary" loading={busy} disabled={!canSend || !text.trim()}>Send</Button>
        </form>
      </div>

      {confirmBlock && (
        <Modal title={`Block ${conv.otherParticipant?.displayName ?? 'this person'}?`} onClose={() => setConfirmBlock(false)}>
          <p>Blocking works both ways. Neither of you will be able to message the other while the block is in place.</p>
          <p className="muted">You can undo this at any time from Account settings.</p>
          <div className="row">
            <Button variant="danger" loading={busy} onClick={block}>Block</Button>
            <Button onClick={() => setConfirmBlock(false)}>Cancel</Button>
          </div>
        </Modal>
      )}

      {arrangeOpen && (
        <Modal title="Record an arrangement" onClose={() => setArrangeOpen(false)}>
          <p className="muted">Record that you’ve agreed on lessons. This creates an engagement you can later mark completed. {user ? '' : ''}</p>
          <Field label="What did you arrange?"><Input value={arrangeTitle} onChange={(e) => setArrangeTitle(e.target.value)} placeholder="e.g. Weekly calculus lessons" /></Field>
          <Button variant="primary" className="btn-block" loading={busy} disabled={arrangeTitle.trim().length < 3} onClick={recordArrangement}>Record arrangement</Button>
        </Modal>
      )}
    </Card>
  );
}
