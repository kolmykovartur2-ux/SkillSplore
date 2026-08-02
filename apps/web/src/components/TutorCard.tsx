import { Link } from 'react-router-dom';
import type { SearchResult } from '../lib/types.js';
import { deliveryLabel, money } from '../lib/format.js';
import { Avatar, Badge, Stars } from './ui.js';

export function TutorCard({ t }: { t: SearchResult }) {
  return (
    <Link to={`/tutors/${t.id}`} className="card card-hover" style={{ display: 'block', color: 'inherit', textDecoration: 'none' }}>
      <div className="card-body">
        <div className="row" style={{ alignItems: 'flex-start' }}>
          <Avatar name={t.displayName} url={t.avatarUrl} size={52} />
          <div className="grow">
            <div className="spread">
              <strong style={{ fontSize: '1.05rem' }}>{t.displayName}</strong>
              {t.verifications.length > 0 && (
                <Badge variant="accent" title={t.verifications.map((v) => v.label).join(', ')}>
                  ✓ {t.verifications[0]!.label}{t.verifications.length > 1 && ` +${t.verifications.length - 1}`}
                </Badge>
              )}
            </div>
            <div className="muted" style={{ fontSize: '0.88rem' }}>{t.headline}</div>
          </div>
        </div>
        <div className="row-wrap" style={{ marginTop: 10 }}>
          {t.ratingCount > 0 ? <Stars rating={t.averageRating} count={t.ratingCount} /> : <span className="muted" style={{ fontSize: '0.82rem' }}>No reviews yet</span>}
        </div>
        <div className="row-wrap" style={{ marginTop: 10 }}>
          {t.subjects.slice(0, 3).map((s) => <Badge key={s}>{s}</Badge>)}
          {t.subjects.length > 3 && <Badge>+{t.subjects.length - 3}</Badge>}
        </div>
        <div className="spread" style={{ marginTop: 12 }}>
          <span className="muted" style={{ fontSize: '0.85rem' }}>
            {[t.city, t.country].filter(Boolean).join(', ')} · {deliveryLabel(t.deliveryMode)}
          </span>
          <strong>{money(t.hourlyRate)}<span className="muted" style={{ fontWeight: 400, fontSize: '0.8rem' }}>/hr</span></strong>
        </div>
      </div>
    </Link>
  );
}
