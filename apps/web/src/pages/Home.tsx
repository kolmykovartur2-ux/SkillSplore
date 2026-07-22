import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApi } from '../lib/useApi.js';
import type { SearchResult, PageMeta } from '../lib/types.js';
import { TutorCard } from '../components/TutorCard.js';
import { Spinner } from '../components/ui.js';

export function Home() {
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const { data, loading } = useApi<{ results: SearchResult[]; meta: PageMeta }>('/search?sort=rating&pageSize=6');

  const submit = (e: FormEvent) => {
    e.preventDefault();
    navigate(`/search?q=${encodeURIComponent(q)}`);
  };

  return (
    <div className="stack">
      <section className="hero">
        <h1>Find the right tutor for you</h1>
        <p style={{ fontSize: '1.1rem', opacity: 0.95, maxWidth: 560 }}>
          Learnfolk connects students with independent tutors across New Zealand and Australia — academic, music, languages and technical skills.
        </p>
        <form className="search-box" onSubmit={submit}>
          <input className="input" placeholder="Try “calculus”, “piano”, “programming”…" value={q} onChange={(e) => setQ(e.target.value)} style={{ border: 'none' }} />
          <button className="btn btn-primary" type="submit">Search</button>
        </form>
      </section>

      <section>
        <div className="section-title"><h2>Top-rated tutors</h2><a href="/search">Browse all →</a></div>
        {loading ? <Spinner /> : (
          <div className="grid grid-cards">
            {data?.results.map((t) => <TutorCard key={t.id} t={t} />)}
          </div>
        )}
      </section>

      <section className="grid grid-2">
        <div className="card"><div className="card-body">
          <h3>For students</h3>
          <p className="muted">Search verified tutors, message them directly, or post a request and let tutors come to you. Arrange lessons and pay the tutor directly.</p>
        </div></div>
        <div className="card"><div className="card-body">
          <h3>For tutors</h3>
          <p className="muted">Create a profile, get approved, appear in search, and respond to student requests. You set your own rates.</p>
        </div></div>
      </section>
    </div>
  );
}
