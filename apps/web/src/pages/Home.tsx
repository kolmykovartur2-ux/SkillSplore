import { useMemo, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useApi } from '../lib/useApi.js';
import type { SearchResult } from '../lib/types.js';
import { TutorCard } from '../components/TutorCard.js';
import { Spinner } from '../components/ui.js';

interface OverviewSubject { id: number; name: string; slug: string; tutorCount: number }
interface OverviewCategory { id: number; name: string; icon: string | null; subjectCount: number; tutorCount: number; subjects: OverviewSubject[] }
interface Overview { categories: OverviewCategory[]; totalSubjects: number; totalApprovedTutors: number }
interface FeaturedReview { id: number; rating: number; body: string; student: string; tutor: string; tutorProfileId: number; subject: string | null }

const STEPS: Array<{ title: string; body: string }> = [
  { title: 'Describe what you need', body: 'Post a request in a couple of minutes — subject, level, and how you like to learn.' },
  { title: 'Tutors send proposals', body: 'Approved tutors reply with a tailored introduction and their own rate — you never see it forced on you.' },
  { title: 'Compare and choose', body: 'Weigh profiles, reviews and price side by side, then message and arrange lessons directly.' },
];

export function Home() {
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const { data: overview } = useApi<Overview>('/taxonomy/overview');
  const { data: top, loading: loadingTop } = useApi<{ results: SearchResult[] }>('/search?sort=rating&pageSize=6');
  const { data: featured } = useApi<{ reviews: FeaturedReview[] }>('/reviews/featured');

  const popularSubjects = useMemo(() => {
    if (!overview) return [];
    return overview.categories
      .flatMap((c) => c.subjects)
      .sort((a, b) => b.tutorCount - a.tutorCount)
      .slice(0, 16);
  }, [overview]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    navigate(`/search?q=${encodeURIComponent(q)}`);
  };

  return (
    <div>
      <section className="hero">
        <div className="blob blob-1" />
        <div className="blob blob-2" />
        <div className="eyebrow">✦ {overview ? `${overview.totalApprovedTutors} approved tutors` : 'A better way to learn'}</div>
        <h1>Learn something new from a <span className="gradient-text">real</span> expert</h1>
        <p className="sub">
          SkillSplore matches students with verified independent tutors across {overview ? `${overview.totalSubjects}+ subjects` : 'academics, music, languages and tech'}.
          Post once, compare real proposals, and choose who you learn from.
        </p>
        <div className="cta-row">
          <Link className="btn btn-primary btn-lg" to="/requests/new">Post a request — it’s free</Link>
          <Link className="btn btn-outline btn-lg" to="/search">Browse tutors</Link>
        </div>
        <form className="searchbar" onSubmit={submit}>
          <input placeholder="Search “piano”, “calculus”, “Python”…" value={q} onChange={(e) => setQ(e.target.value)} />
          <button className="btn btn-gradient" type="submit">Search</button>
        </form>
        {overview && (
          <div className="stat-strip">
            <div className="stat"><span className="num">{overview.totalApprovedTutors}</span><span className="label">Verified tutors</span></div>
            <div className="stat"><span className="num">{overview.totalSubjects}+</span><span className="label">Subjects</span></div>
            <div className="stat"><span className="num">2</span><span className="label">Countries</span></div>
            <div className="stat"><span className="num">0%</span><span className="label">Platform fees</span></div>
          </div>
        )}
      </section>

      <section className="section">
        <div className="section-title" style={{ display: 'block', textAlign: 'center' }}>
          <span className="kicker">How it works</span>
          <h2 className="mt-0">Three steps to your first lesson</h2>
        </div>
        <div className="steps-row">
          {STEPS.map((s, i) => (
            <div className="step-card" key={s.title}>
              <div className="step-num">{String(i + 1).padStart(2, '0')}</div>
              <h3>{s.title}</h3>
              <p>{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="section-tight">
        <div className="section-title">
          <div><span className="kicker">Popular</span><h2 className="mt-0">Subjects students are searching</h2></div>
          <Link to="/search">All subjects →</Link>
        </div>
        <div className="pill-cloud">
          {popularSubjects.map((s) => (
            <Link key={s.id} to={`/search?subjectId=${s.id}`} className="subject-pill">
              {s.name} {s.tutorCount > 0 && <span className="pill-count">· {s.tutorCount}</span>}
            </Link>
          ))}
        </div>
      </section>

      <section className="section">
        <div className="section-title">
          <div><span className="kicker">Top rated</span><h2 className="mt-0">Tutors students love</h2></div>
          <Link to="/search">Browse all →</Link>
        </div>
        {loadingTop ? <Spinner /> : (
          <div className="grid grid-cards">
            {top?.results.map((t) => <TutorCard key={t.id} t={t} />)}
          </div>
        )}
      </section>

      {featured && featured.reviews.length > 0 && (
        <section className="section-tight">
          <div className="section-title" style={{ display: 'block', textAlign: 'center' }}>
            <span className="kicker">Real reviews</span>
            <h2 className="mt-0">What students say</h2>
          </div>
          <div className="grid grid-cards">
            {featured.reviews.slice(0, 3).map((r) => (
              <div className="testimonial-card" key={r.id}>
                <span className="quote-mark">“</span>
                <p>{r.body}</p>
                <div className="who">
                  <div>
                    <div className="who-name">{r.student}</div>
                    <div className="who-sub">on {r.tutor}{r.subject ? ` · ${r.subject}` : ''}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="section">
        <div className="grid grid-2">
          <div className="card"><div className="card-body">
            <h3>For students</h3>
            <p className="muted">Search verified tutors, message them directly, or post a request and let tutors come to you. Arrange lessons and pay the tutor directly — no platform fees, ever.</p>
            <Link className="btn btn-gradient" to="/requests/new">Post a request</Link>
          </div></div>
          <div className="card"><div className="card-body">
            <h3>For tutors</h3>
            <p className="muted">Create a profile, get approved, appear in search, and respond to student requests. You set your own rates and keep 100% of what you earn.</p>
            <Link className="btn btn-outline" to="/tutor/onboarding">Become a tutor</Link>
          </div></div>
        </div>
      </section>
    </div>
  );
}
