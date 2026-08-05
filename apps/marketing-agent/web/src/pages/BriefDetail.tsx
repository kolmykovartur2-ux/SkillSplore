import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApi } from '../lib/useApi.js';
import { api, ApiError } from '../lib/api.js';
import { useToast } from '../lib/toast.js';
import { Button, Card, Spinner, Field, Input, Select } from '../components/ui.js';

interface Brief {
  id: number;
  objective: string;
  audience: string;
  mainIdea: string;
  desiredReaderAction: string;
  tone: string;
  maxLength: number;
  pillar?: { name: string } | null;
}

interface Angle { key: string; label: string; summary: string }
interface AngleData { angles: Angle[]; anglesEffective: boolean; contentProvider: string }
interface ReelFormat { key: string; label: string; aspectRatio: string; targetDurationSeconds: [number, number] }
interface ReelData { formats: ReelFormat[]; scriptsEffective: boolean; contentProvider: string }

export function BriefDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data, loading } = useApi<{ brief: Brief }>(`/briefs/${id}`);
  const { data: angleData } = useApi<AngleData>('/drafts/creative-angles');
  const { data: reelData } = useApi<ReelData>('/drafts/reel-formats');
  const toast = useToast();
  const [variantCount, setVariantCount] = useState(3);
  const [angleKey, setAngleKey] = useState('');
  const [platformKeys, setPlatformKeys] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  if (loading) return <Spinner />;
  if (!data?.brief) return <p>Not found.</p>;
  const brief = data.brief;

  const generate = async () => {
    setBusy(true);
    try {
      const res = await api.post<{ drafts: { id: number }[]; providerUsed: string; fellBackToTemplate: boolean }>('/drafts/generate', {
        briefId: brief.id,
        variantCount,
        ...(angleKey ? { angleKey } : {}),
      });
      toast(`Generated ${res.drafts.length} draft(s) via ${res.providerUsed}${res.fellBackToTemplate ? ' (fell back to template)' : ''}.`, 'success');
      if (res.drafts[0]) navigate(`/drafts/${res.drafts[0].id}`);
    } catch (err) {
      toast(err instanceof ApiError ? err.message : 'Failed to generate drafts.', 'error');
    } finally {
      setBusy(false);
    }
  };

  const generateReel = async () => {
    if (!platformKeys.length) return toast('Pick at least one platform.', 'error');
    setBusy(true);
    try {
      const res = await api.post<{ drafts: { id: number }[]; providerUsed: string; fellBackToTemplate: boolean }>(
        '/drafts/generate-reel',
        { briefId: brief.id, platformKeys, ...(angleKey ? { angleKey } : {}) },
      );
      toast(`Generated ${res.drafts.length} script(s) via ${res.providerUsed}.`, 'success');
      if (res.drafts[0]) navigate(`/drafts/${res.drafts[0].id}`);
    } catch (err) {
      toast(err instanceof ApiError ? err.message : 'Failed to generate scripts.', 'error');
    } finally {
      setBusy(false);
    }
  };

  const togglePlatform = (key: string) =>
    setPlatformKeys((keys) => (keys.includes(key) ? keys.filter((k) => k !== key) : [...keys, key]));

  return (
    <div className="page container">
      <h1>Brief #{brief.id}</h1>
      <Card>
        <div className="card-body stack">
          <p>
            <strong>Objective:</strong> {brief.objective}
          </p>
          <p>
            <strong>Audience:</strong> {brief.audience}
          </p>
          <p>
            <strong>Main idea:</strong> {brief.mainIdea}
          </p>
          <p>
            <strong>Pillar:</strong> {brief.pillar?.name ?? '—'}
          </p>
          <p>
            <strong>Desired reader action:</strong> {brief.desiredReaderAction}
          </p>
          <div className="divider" />
          <Field label="Number of variants (up to 3)">
            <Input type="number" min={1} max={3} value={variantCount} onChange={(e) => setVariantCount(Number(e.target.value))} style={{ width: 90 }} />
          </Field>
          <Field
            label="Creative angle"
            hint={
              angleKey
                ? angleData?.angles.find((a) => a.key === angleKey)?.summary
                : 'Optional. Shapes how the post is written — pick one to get a sharper, more specific piece than the default.'
            }
          >
            <Select value={angleKey} onChange={(e) => setAngleKey(e.target.value)} style={{ maxWidth: 420 }}>
              <option value="">No particular angle</option>
              {angleData?.angles.map((a) => (
                <option key={a.key} value={a.key}>
                  {a.label}
                </option>
              ))}
            </Select>
          </Field>
          {angleData && !angleData.anglesEffective && (
            <p className="muted">
              Heads up: <code>CONTENT_AI_PROVIDER</code> is <code>{angleData.contentProvider}</code>, which builds posts
              from fixed sentence patterns and cannot follow a creative angle. Switch it to <code>anthropic</code> or{' '}
              <code>openai_compatible</code> for these to have any effect.
            </p>
          )}
          <Button variant="primary" onClick={() => void generate()} loading={busy}>
            Generate drafts
          </Button>
        </div>
      </Card>

      <Card style={{ marginTop: 16 }}>
        <div className="card-body stack">
          <h3 style={{ margin: 0 }}>Short-form video scripts</h3>
          <p className="muted" style={{ marginTop: 0 }}>
            Produces a hook, beat-by-beat shot list, on-screen text and caption for each platform — written to be filmed
            on a phone. Uses the same creative angle selected above.
          </p>
          <Field label="Platforms">
            <div className="row-wrap">
              {reelData?.formats.map((f) => (
                <label key={f.key} className="row" style={{ gap: 6, alignItems: 'center' }}>
                  <input type="checkbox" checked={platformKeys.includes(f.key)} onChange={() => togglePlatform(f.key)} />
                  <span>
                    {f.label}{' '}
                    <span className="muted">
                      ({f.aspectRatio}, {f.targetDurationSeconds[0]}–{f.targetDurationSeconds[1]}s)
                    </span>
                  </span>
                </label>
              ))}
            </div>
          </Field>
          {reelData && !reelData.scriptsEffective && (
            <p className="muted">
              With <code>CONTENT_AI_PROVIDER={reelData.contentProvider}</code> you will get a correctly structured
              filming scaffold with the hook left blank, not written copy. Switch to <code>anthropic</code> or{' '}
              <code>openai_compatible</code> for a written hook and script.
            </p>
          )}
          <Button variant="primary" onClick={() => void generateReel()} loading={busy} disabled={!platformKeys.length}>
            Generate scripts
          </Button>
        </div>
      </Card>
    </div>
  );
}
