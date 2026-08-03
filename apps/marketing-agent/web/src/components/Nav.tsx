import { NavLink } from 'react-router-dom';
import { useAuth } from '../lib/auth.js';

const LINKS: [string, string][] = [
  ['/', 'Overview'],
  ['/calendar', 'Calendar'],
  ['/ideas', 'Ideas'],
  ['/briefs', 'Briefs'],
  ['/drafts', 'Drafts'],
  ['/review-queue', 'Review queue'],
  ['/scheduled', 'Scheduled'],
  ['/published', 'Published'],
  ['/failed', 'Failed'],
  ['/campaigns', 'Campaigns'],
  ['/pillars', 'Pillars'],
  ['/facts', 'Facts'],
  ['/media', 'Media'],
  ['/consents', 'Consents'],
  ['/linkedin', 'LinkedIn'],
  ['/analytics', 'Analytics'],
  ['/audit-log', 'Audit log'],
  ['/settings', 'Settings'],
];

export function Nav() {
  const { user, config, logout } = useAuth();
  return (
    <div className="nav">
      <div className="container">
        <div className="nav-inner" style={{ flexWrap: 'wrap', height: 'auto', paddingTop: 10, paddingBottom: 10 }}>
          <span className="brand">
            <span className="dot" /> SkillSplore Marketing
          </span>
          {config?.appEnv !== 'production' && <span className="badge badge-warning">{config?.appEnv ?? '…'}</span>}
          {config?.mockLinkedinApi && <span className="badge badge-accent">LinkedIn: mock</span>}
          <div className="nav-links">
            {LINKS.map(([path, label]) => (
              <NavLink key={path} to={path} end={path === '/'} className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
                {label}
              </NavLink>
            ))}
          </div>
          {user && (
            <button className="btn btn-ghost btn-sm" onClick={() => void logout()}>
              Log out ({user.displayName})
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
