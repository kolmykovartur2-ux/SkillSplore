import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useApi } from '../lib/useApi.js';
import { Card, Input } from '../components/ui.js';

interface BrowseSubject { id: number; name: string; slug: string; tutorCount: number }
interface BrowseCategory {
  id: number;
  name: string;
  icon: string | null;
  description: string | null;
  isFeatured: boolean;
  subjectCount: number;
  tutorCount: number;
  subjects: BrowseSubject[];
}

/**
 * The full catalogue.
 *
 * The homepage shows only featured categories, which left everything else
 * reachable solely through the search page's filter dropdown. This page is the
 * discovery path for the rest -- without it, most of the catalogue may as well
 * not exist.
 */
export function Categories() {
  const { data, loading } = useApi<{
    categories: BrowseCategory[];
    totalCategories: number;
    totalSubjects: number;
  }>('/taxonomy/browse');
  const [filter, setFilter] = useState('');

  const needle = filter.trim().toLowerCase();
  const categories = (data?.categories ?? []).filter((c) => {
    if (!needle) return true;
    return (
      c.name.toLowerCase().includes(needle)
      || c.subjects.some((s) => s.name.toLowerCase().includes(needle))
    );
  });

  return (
    <div className="container" style={{ margin: '0 auto' }}>
      <h1>Everything you can learn here</h1>
      {data && (
        <p className="muted">
          {data.totalCategories} categories · {data.totalSubjects} subjects. Can’t see what you
          need? <Link to="/requests/new">Post what you want to learn</Link> — you can describe
          anything, even if it isn’t listed.
        </p>
      )}

      <div style={{ maxWidth: 420, margin: '18px 0 26px' }}>
        <Input
          type="search"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Filter categories and subjects…"
          aria-label="Filter categories and subjects"
        />
      </div>

      {loading && <p className="muted">Loading…</p>}

      {!loading && categories.length === 0 && (
        <Card>
          <div className="card-body">
            <p>Nothing matches “{filter}”.</p>
            <p className="muted">
              That doesn’t mean nobody can teach it.{' '}
              <Link to="/requests/new">Post what you want to learn</Link> and describe it in your
              own words.
            </p>
          </div>
        </Card>
      )}

      <div className="stack">
        {categories.map((c) => (
          <Card key={c.id}>
            <div className="card-body">
              <div className="spread" style={{ alignItems: 'baseline', gap: 12 }}>
                <h2 style={{ margin: 0 }}>
                  {c.icon && <span aria-hidden="true" style={{ marginRight: 8 }}>{c.icon}</span>}
                  <Link to={`/search?categoryId=${c.id}`}>{c.name}</Link>
                </h2>
                <span className="muted" style={{ fontSize: '0.85rem' }}>
                  {c.subjectCount} subject{c.subjectCount === 1 ? '' : 's'}
                  {/* Only shown when non-zero. "0 teachers" on every tile of a
                      new marketplace reads as abandoned rather than as new. */}
                  {c.tutorCount > 0 && <> · {c.tutorCount} teaching</>}
                </span>
              </div>

              {c.description && <p className="muted">{c.description}</p>}

              <div className="chip-row" style={{ marginTop: 10 }}>
                {c.subjects.map((s) => (
                  <Link key={s.id} to={`/search?subjectId=${s.id}`} className="chip">
                    {s.name}
                    {s.tutorCount > 0 && <span className="muted"> · {s.tutorCount}</span>}
                  </Link>
                ))}
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
