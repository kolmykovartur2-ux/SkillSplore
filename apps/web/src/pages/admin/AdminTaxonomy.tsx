import { useState } from 'react';
import { api, ApiError } from '../../lib/api.js';
import { useApi } from '../../lib/useApi.js';
import { useToast } from '../../lib/toast.js';
import { AdminNav } from '../../components/AdminNav.js';
import { Badge, Button, Card, Field, Input, Select, Spinner } from '../../components/ui.js';

interface Category { id: number; name: string; subjects: { id: number; name: string }[] }
interface Level { id: number; name: string }

export function AdminTaxonomy() {
  const toast = useToast();
  const { data: cats, loading, reload } = useApi<{ categories: Category[] }>('/taxonomy/categories');
  const { data: levels, reload: reloadLevels } = useApi<{ levels: Level[] }>('/taxonomy/levels');
  const [catName, setCatName] = useState('');
  const [catTracks, setCatTracks] = useState('PROFESSIONAL');
  const [subName, setSubName] = useState('');
  const [subCat, setSubCat] = useState('');
  const [levelName, setLevelName] = useState('');

  const wrap = (fn: () => Promise<unknown>) => async () => {
    try { await fn(); toast('Saved', 'success'); reload(); reloadLevels(); }
    catch (e) { toast(e instanceof ApiError ? e.message : 'Failed', 'error'); }
  };

  if (loading) return <><AdminNav /><Spinner /></>;

  return (
    <div>
      <AdminNav />
      <h1>Taxonomy</h1>
      <div className="grid grid-2">
        <Card><div className="card-body">
          <h3 className="mt-0">Categories & subjects</h3>
          {cats?.categories.map((c) => (
            <div key={c.id} style={{ marginBottom: 10 }}>
              <strong>{c.name}</strong>
              <div className="row-wrap" style={{ marginTop: 4 }}>{c.subjects.map((s) => <Badge key={s.id}>{s.name}</Badge>)}</div>
            </div>
          ))}
          <div className="divider" />
          <Field label="New category">
            <div className="row">
              <Input value={catName} onChange={(e) => setCatName(e.target.value)} />
              {/* Decides which levels tutors are offered for every subject in
                  the category. Defaults to the skill ladder, because most of
                  this catalogue is not school subjects. */}
              <Select value={catTracks} onChange={(e) => setCatTracks(e.target.value)} style={{ width: 210 }}>
                <option value="PROFESSIONAL">Experience levels</option>
                <option value="ACADEMIC">School &amp; university levels</option>
                <option value="ACADEMIC,PROFESSIONAL">Both</option>
              </Select>
              <Button disabled={catName.length < 2} onClick={wrap(async () => { await api.post('/admin/categories', { name: catName, levelTracks: catTracks.split(',') }); setCatName(''); setCatTracks('PROFESSIONAL'); })}>Add</Button>
            </div>
            <p className="hint">Which levels tutors pick from for subjects in this category.</p>
          </Field>
          <Field label="New subject">
            <div className="row">
              <Input value={subName} onChange={(e) => setSubName(e.target.value)} placeholder="Subject name" />
              <Select value={subCat} onChange={(e) => setSubCat(e.target.value)} style={{ width: 160 }}><option value="">No category</option>{cats?.categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</Select>
              <Button disabled={subName.length < 2} onClick={wrap(async () => { await api.post('/admin/subjects', { name: subName, categoryId: subCat ? Number(subCat) : null }); setSubName(''); })}>Add</Button>
            </div>
          </Field>
        </div></Card>
        <Card><div className="card-body">
          <h3 className="mt-0">Teaching levels</h3>
          <div className="row-wrap">{levels?.levels.map((l) => <Badge key={l.id}>{l.name}</Badge>)}</div>
          <div className="divider" />
          <Field label="New level"><div className="row"><Input value={levelName} onChange={(e) => setLevelName(e.target.value)} /><Button disabled={levelName.length < 1} onClick={wrap(async () => { await api.post('/admin/levels', { name: levelName }); setLevelName(''); })}>Add</Button></div></Field>
        </div></Card>
      </div>
    </div>
  );
}
