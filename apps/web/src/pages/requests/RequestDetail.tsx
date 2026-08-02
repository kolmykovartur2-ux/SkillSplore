import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api, ApiError } from '../../lib/api.js';
import { useApi } from '../../lib/useApi.js';
import { useToast } from '../../lib/toast.js';
import type { Money, PublicUser } from '../../lib/types.js';
import { Avatar, Badge, Button, Card, EmptyState, Field, Input, Spinner, StatusBadge, Stars, Textarea } from '../../components/ui.js';
import { dateStr, deliveryLabel, money } from '../../lib/format.js';

interface ReqCore { id: number; title: string; description: string; deliveryMode: string; country: string | null; city: string | null; budgetMin: Money | null; budgetMax: Money | null; timing: string | null; status: string; subject: { name: string }; level: { name: string } | null; createdAt: string }
interface OwnerResp { id: number; status: string; introduction: string; proposedRate: Money | null; availabilityNote: string | null; createdAt: string; tutor: { profileId: number; averageRating: number; ratingCount: number; headline: string | null } & PublicUser }
interface MyResp { id: number; status: string; introduction: string; proposedRate: Money | null; availabilityNote: string | null }
interface DetailData { request: ReqCore; student: PublicUser; isOwner: boolean; responses?: OwnerResp[]; responseCount?: number; myResponse?: MyResp | null }

export function RequestDetail() {
  const { id } = useParams();
  const { data, loading, error, reload } = useApi<DetailData>(`/requests/${id}`);

  if (loading) return <Spinner />;
  if (error || !data) return <EmptyState emoji="🚫" title="Request unavailable">You may not have access to this request.</EmptyState>;

  const r = data.request;
  return (
    <div className="stack">
      <Card><div className="card-body">
        <div className="spread"><h1 className="mt-0">{r.title}</h1><StatusBadge status={r.status} /></div>
        <div className="row-wrap"><Badge>{r.subject.name}</Badge>{r.level && <Badge>{r.level.name}</Badge>}<span className="muted">{deliveryLabel(r.deliveryMode)}{r.city ? ` · ${r.city}, ${r.country}` : ''}</span></div>
        <p style={{ whiteSpace: 'pre-wrap', marginTop: 12 }}>{r.description}</p>
        <div className="row-wrap muted" style={{ fontSize: '0.88rem' }}>
          {(r.budgetMin || r.budgetMax) && <span>Budget: {money(r.budgetMin)}{r.budgetMax ? `–${money(r.budgetMax)}` : '+'} /hr</span>}
          {r.timing && <span>· Timing: {r.timing}</span>}
          <span>· Posted {dateStr(r.createdAt)} by {data.student.displayName}</span>
        </div>
      </div></Card>

      {data.isOwner ? <OwnerView responses={data.responses ?? []} currency={r.budgetMin?.currency ?? 'NZD'} onChanged={reload} />
        : <TutorView requestId={r.id} myResponse={data.myResponse ?? null} responseCount={data.responseCount ?? 0} onChanged={reload} />}
    </div>
  );
}

function OwnerView({ responses, onChanged }: { responses: OwnerResp[]; currency: string; onChanged: () => void }) {
  const navigate = useNavigate();
  const toast = useToast();

  const accept = async (respId: number) => {
    try {
      const { conversationId } = await api.post<{ conversationId: number }>(`/responses/${respId}/accept`);
      toast('Response accepted — conversation opened', 'success');
      navigate(`/messages/${conversationId}`);
    } catch (e) { toast(e instanceof ApiError ? e.message : 'Failed', 'error'); }
  };
  const decline = async (respId: number) => {
    try { await api.post(`/responses/${respId}/decline`); toast('Response declined'); onChanged(); }
    catch (e) { toast(e instanceof ApiError ? e.message : 'Failed', 'error'); }
  };

  return (
    <div>
      <h2>Responses ({responses.length})</h2>
      <p className="muted">Compare the person and their proposal. The cheapest option isn’t always the best fit.</p>
      {responses.length === 0 ? <EmptyState emoji="⌛" title="No responses yet">Suitable people will see this request and can respond.</EmptyState> : (
        <div className="stack-sm">
          {responses.map((resp) => (
            <Card key={resp.id}><div className="card-body">
              <div className="spread">
                <div className="row">
                  <Avatar name={resp.tutor.displayName} url={resp.tutor.avatarUrl} size={48} />
                  <div>
                    <Link to={`/tutors/${resp.tutor.profileId}`}><strong>{resp.tutor.displayName}</strong></Link>
                    <div className="muted" style={{ fontSize: '0.85rem' }}>{resp.tutor.headline}</div>
                    {resp.tutor.ratingCount > 0 && <Stars rating={resp.tutor.averageRating} count={resp.tutor.ratingCount} />}
                  </div>
                </div>
                <div className="center"><div style={{ fontWeight: 700 }}>{money(resp.proposedRate)}</div><small>proposed /hr</small></div>
              </div>
              <p style={{ whiteSpace: 'pre-wrap', marginTop: 10 }}>{resp.introduction}</p>
              {resp.availabilityNote && <p className="muted" style={{ fontSize: '0.86rem' }}>Availability: {resp.availabilityNote}</p>}
              <div className="row-wrap">
                {resp.status === 'PENDING' ? (
                  <>
                    <Button variant="primary" className="btn-sm" onClick={() => accept(resp.id)}>Accept</Button>
                    <Button className="btn-sm" onClick={() => decline(resp.id)}>Decline</Button>
                  </>
                ) : <StatusBadge status={resp.status} />}
                <Link className="btn btn-sm" to={`/tutors/${resp.tutor.profileId}`}>View profile</Link>
              </div>
            </div></Card>
          ))}
        </div>
      )}
    </div>
  );
}

function TutorView({ requestId, myResponse, responseCount, onChanged }: { requestId: number; myResponse: MyResp | null; responseCount: number; onChanged: () => void }) {
  const toast = useToast();
  const [intro, setIntro] = useState(myResponse?.introduction ?? '');
  const [rate, setRate] = useState(myResponse?.proposedRate ? String(myResponse.proposedRate.cents / 100) : '');
  const [avail, setAvail] = useState(myResponse?.availabilityNote ?? '');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    try {
      if (myResponse) {
        await api.patch(`/responses/${myResponse.id}`, { introduction: intro, proposedRateCents: rate ? Math.round(Number(rate) * 100) : null, availabilityNote: avail });
        toast('Response updated', 'success');
      } else {
        await api.post('/responses', { requestId, introduction: intro, proposedRateCents: rate ? Math.round(Number(rate) * 100) : null, availabilityNote: avail });
        toast('Response submitted', 'success');
      }
      onChanged();
    } catch (e) { toast(e instanceof ApiError ? e.message : 'Failed', 'error'); }
    finally { setBusy(false); }
  };

  const withdraw = async () => {
    if (!myResponse) return;
    try { await api.post(`/responses/${myResponse.id}/withdraw`); toast('Response withdrawn'); onChanged(); }
    catch (e) { toast(e instanceof ApiError ? e.message : 'Failed', 'error'); }
  };

  const locked = myResponse && myResponse.status !== 'PENDING' && myResponse.status !== 'WITHDRAWN';

  return (
    <Card><div className="card-body">
      <div className="spread"><h2 className="mt-0">Your response</h2><span className="muted">{responseCount} {responseCount === 1 ? 'person has' : 'people have'} responded</span></div>
      {myResponse && <p><StatusBadge status={myResponse.status} /></p>}
      {locked ? (
        <p className="muted">This response is {myResponse!.status.toLowerCase()} and can no longer be edited.</p>
      ) : (
        <>
          <Field label="Your introduction"><Textarea value={intro} onChange={(e) => setIntro(e.target.value)} placeholder="Explain how you can help, tailored to this learner…" /></Field>
          <div className="grid grid-2">
            <Field label="Your proposed rate / hr"><Input type="number" min={0} value={rate} onChange={(e) => setRate(e.target.value)} /></Field>
            <Field label="Availability (optional)"><Input value={avail} onChange={(e) => setAvail(e.target.value)} /></Field>
          </div>
          <p className="hint">You can’t see other people’s proposed rates.</p>
          <div className="row">
            <Button variant="primary" loading={busy} disabled={intro.trim().length < 10} onClick={submit}>{myResponse ? 'Update response' : 'Submit response'}</Button>
            {myResponse && myResponse.status === 'PENDING' && <Button onClick={withdraw}>Withdraw</Button>}
          </div>
        </>
      )}
    </div></Card>
  );
}
