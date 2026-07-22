import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useApi } from '../lib/useApi.js';
import type { SearchResult } from '../lib/types.js';
import { TutorCard } from '../components/TutorCard.js';
import { Spinner } from '../components/ui.js';

interface OverviewSubject { id: number; name: string; slug: string; tutorCount: number }
interface OverviewCategory { id: number; name: string; icon: string | null; subjectCount: number; tutorCount: number; subjects: OverviewSubject[] }
interface Overview { categories: OverviewCategory[]; totalSubjects: number; totalApprovedTutors: number }

const PROPS: Array<{ icon: string; title: string; body: string }> = [
  { icon: '📝', title: 'Post once, tutors reply', body: 'Describe what you need — approved tutors send you tailored proposals with their price.' },
  { icon: '💸', title: 'Compare and choose', body: 'See real proposed rates side by side. The cheapest option isn’t automatically flagged as best.' },
  { icon: '🛡️', title: 'Verified tutors', body: 'We ask tutors to submit qualifications, which our team checks before they go live.' },
  { icon: '⭐', title: 'Real reviews only', body: 'A review can only be left after a real, completed engagement — never fabricated.' },
];

export function Home() {
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const { data: overview, loading: loadingOverview } = useApi<Overview>('/taxonomy/overview');
  const { data: top, loading: loadingTop } = useApi<{ results: SearchResult[] }>('/search?sort=rating&pageSize=6');

  const submit = (e: FormEvent) => {
    e.preventDefault();
    navigate(`/search?q=${encodeURIComponent(q)}`);
  };

  return (
    <div className="stack">
      <section className="hero">
        <div className="eyebrow">Learnfolk</div>
        <h1>Find your perfect tutor</h1>
        <p className="sub">
          Connect with verified independent tutors across New Zealand and Australia — from
          {overview ? ` ${overview.totalSubjects}+ subjects` : ' academic subjects'} to music, languages and technical skills.
        </p>
        <form className="searchbar" onSubmit={submit}>
          <input placeholder="Try “calculus”, “piano”, “programming”…" value={q} onChange={(e) => setQ(e.target.value)} />
          <button className="btn btn-primary btn-lg" type="submit">Search</button>
        </form>
        {overview && (
          <p className="trust-line">
            <strong>{overview.totalApprovedTutors}</strong> approved tutors across <strong>{overview.totalSubjects}</strong> subjects
          </p>
        )}
      </section>

      <section className="props">
        {PROPS.map((p) => (
          <div className="prop" key={p.title}>
            <div className="prop-icon">{p.icon}</div>
            <h4>{p.title}</h4>
            <p>{p.body}</p>
          </div>
        ))}
      </section>

      <section>
        <div className="section-title"><h2 className="mt-0">Browse by subject</h2></div>
        {loadingOverview ? <Spinner /> : (
          <div className="cat-grid">
            {overview?.categories.map((c) => (
              <div key={c.id} className="cat-tile">
                <div className="cat-head">
                  <span className="cat-icon">{c.icon ?? '📘'}</span>
                  <div>
                    <h3>{c.name}</h3>
                    <div className="cat-count">{c.tutorCount} tutor{c.tutorCount === 1 ? '' : 's'} · {c.subjectCount} subjects</div>
                  </div>
                </div>
                <div className="cat-links">
                  {c.subjects.slice(0, 5).map((s) => (
                    <Link key={s.id} to={`/search?subjectId=${s.id}`}>{s.name}</Link>
                  ))}
                  {c.subjectCount > 5 && (
                    <Link className="cat-more" to={`/search?category=${c.id}`}>All {c.subjectCount} subjects →</Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <div className="section-title"><h2 className="mt-0">Top-rated tutors</h2><Link to="/search">Browse all →</Link></div>
        {loadingTop ? <Spinner /> : (
          <div className="grid grid-cards">
            {top?.results.map((t) => <TutorCard key={t.id} t={t} />)}
          </div>
        )}
      </section>

      <section className="grid grid-2">
        <div className="card"><div className="card-body">
          <h3>For students</h3>
          <p className="muted">Search verified tutors, message them directly, or post a request and let tutors come to you. Arrange lessons and pay the tutor directly.</p>
          <Link className="btn btn-gradient" to="/requests/new">Post a request</Link>
        </div></div>
        <div className="card"><div className="card-body">
          <h3>For tutors</h3>
          <p className="muted">Create a profile, get approved, appear in search, and respond to student requests. You set your own rates.</p>
          <Link className="btn btn-outline" to="/tutor/onboarding">Become a tutor</Link>
        </div></div>
      </section>
    </div>
  );
}
