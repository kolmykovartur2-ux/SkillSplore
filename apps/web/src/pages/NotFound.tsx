import { Link, useLocation } from 'react-router-dom';
import { Card } from '../components/ui.js';

/**
 * A real 404.
 *
 * This replaces a `<Navigate to="/" replace />` catch-all, which silently
 * dropped anyone with a typo'd or dead link onto the homepage with no
 * explanation. That is confusing for a person (they think the link worked and
 * the content vanished) and actively harmful for search engines, which see
 * every bad URL return a 200 with homepage content.
 */
export function NotFound() {
  const location = useLocation();

  return (
    <div className="container-narrow" style={{ margin: '0 auto' }}>
      <Card>
        <div className="card-body">
          <h1>We couldn’t find that page</h1>
          <p className="muted">
            Nothing lives at <code>{location.pathname}</code>. The link may be out of date, or the
            page may have moved.
          </p>

          <h2>Try one of these</h2>
          <ul>
            <li><Link to="/">Home</Link></li>
            <li><Link to="/search">Browse people who teach</Link></li>
            <li><Link to="/categories">See everything you can learn</Link></li>
            <li><Link to="/requests/new">Post what you want to learn</Link></li>
            <li><Link to="/contact">Contact us</Link></li>
          </ul>

          <p className="muted">
            If you followed a link on this site to get here, please tell us using the feedback
            button — that is a bug on our side, not yours.
          </p>
        </div>
      </Card>
    </div>
  );
}
