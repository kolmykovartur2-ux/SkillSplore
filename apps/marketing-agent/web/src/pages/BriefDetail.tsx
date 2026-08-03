import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApi } from '../lib/useApi.js';
import { api, ApiError } from '../lib/api.js';
import { useToast } from '../lib/toast.js';
import { Button, Card, Spinner, Field, Input } from '../components/ui.js';

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

export function BriefDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data, loading } = useApi<{ brief: Brief }>(`/briefs/${id}`);
  const toast = useToast();
  const [variantCount, setVariantCount] = useState(3);
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
      });
      toast(`Generated ${res.drafts.length} draft(s) via ${res.providerUsed}${res.fellBackToTemplate ? ' (fell back to template)' : ''}.`, 'success');
      if (res.drafts[0]) navigate(`/drafts/${res.drafts[0].id}`);
    } catch (err) {
      toast(err instanceof ApiError ? err.message : 'Failed to generate drafts.', 'error');
    } finally {
      setBusy(false);
    }
  };

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
          <Button variant="primary" onClick={() => void generate()} loading={busy}>
            Generate drafts
          </Button>
        </div>
      </Card>
    </div>
  );
}
