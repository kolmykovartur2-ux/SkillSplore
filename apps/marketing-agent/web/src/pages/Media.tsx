import { useRef, useState } from 'react';
import { useApi } from '../lib/useApi.js';
import { api, ApiError } from '../lib/api.js';
import { useToast } from '../lib/toast.js';
import { Button, Card, Spinner, EmptyState, Field, Input, Select, Badge } from '../components/ui.js';

interface Asset { id: number; filename: string; kind: string; usageRights: string; attribution: string | null; consent: unknown }

export function Media() {
  const { data, loading, reload } = useApi<{ assets: Asset[] }>('/media');
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [kind, setKind] = useState('SCREENSHOT');
  const [usageRights, setUsageRights] = useState('');
  const [attribution, setAttribution] = useState('');
  const [busy, setBusy] = useState(false);

  const upload = async () => {
    const file = fileRef.current?.files?.[0];
    if (!file) return toast('Choose a file first.', 'error');
    if (!usageRights) return toast('Usage rights are required for every asset.', 'error');
    const form = new FormData();
    form.append('file', file);
    form.append('kind', kind);
    form.append('usageRights', usageRights);
    if (attribution) form.append('attribution', attribution);
    setBusy(true);
    try {
      await api.post('/media', form);
      toast('Uploaded.', 'success');
      setUsageRights('');
      setAttribution('');
      if (fileRef.current) fileRef.current.value = '';
      await reload();
    } catch (err) {
      toast(err instanceof ApiError ? err.message : 'Upload failed.', 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="page container">
      <h1>Media library</h1>
      <p className="muted">Every asset needs documented usage rights — no image is used just because it was found online (§19).</p>
      <Card style={{ margin: '20px 0' }}>
        <div className="card-body">
          <h3>Upload</h3>
          <div className="row-wrap">
            <input type="file" ref={fileRef} accept="image/png,image/jpeg,image/webp,image/svg+xml" />
            <Field label="Kind">
              <Select value={kind} onChange={(e) => setKind(e.target.value)} style={{ width: 160 }}>
                {['LOGO', 'SCREENSHOT', 'PHOTO', 'DIAGRAM', 'POST_IMAGE', 'OTHER'].map((k) => (
                  <option key={k} value={k}>
                    {k}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Usage rights">
              <Input value={usageRights} onChange={(e) => setUsageRights(e.target.value)} placeholder="e.g. Owned, taken by the founder" style={{ width: 260 }} />
            </Field>
            <Field label="Attribution (optional)">
              <Input value={attribution} onChange={(e) => setAttribution(e.target.value)} style={{ width: 200 }} />
            </Field>
            <Button variant="primary" onClick={() => void upload()} loading={busy}>
              Upload
            </Button>
          </div>
        </div>
      </Card>

      {loading ? <Spinner /> : !data?.assets.length ? (
        <EmptyState title="No media yet" />
      ) : (
        <div className="grid grid-cards">
          {data.assets.map((a) => (
            <Card key={a.id}>
              <div className="card-body">
                <Badge>{a.kind}</Badge>
                <p style={{ marginTop: 8 }}>{a.filename}</p>
                <p className="muted">{a.usageRights}</p>
                {a.attribution && <p className="muted">Attribution: {a.attribution}</p>}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
