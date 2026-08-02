import { useEffect, useState, type ReactNode } from 'react';
import { NavLink, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth.js';
import { api } from '../lib/api.js';
import { Avatar } from './ui.js';
import { ARRANGEMENT_DISCLAIMER } from '../lib/pricingCopy.js';

function useBadgeCounts(loggedIn: boolean) {
  const [messages, setMessages] = useState(0);
  const [alerts, setAlerts] = useState(0);
  useEffect(() => {
    if (!loggedIn) return;
    let active = true;
    const poll = async () => {
      try {
        const [m, n] = await Promise.all([
          api.get<{ unreadCount: number }>('/conversations/unread-count'),
          api.get<{ unreadCount: number }>('/notifications/unread-count'),
        ]);
        if (active) { setMessages(m.unreadCount); setAlerts(n.unreadCount); }
      } catch { /* ignore */ }
    };
    poll();
    const id = setInterval(poll, 15000);
    return () => { active = false; clearInterval(id); };
  }, [loggedIn]);
  return { messages, alerts };
}

export function Layout({ children }: { children: ReactNode }) {
  const { user, config, hasRole, logout } = useAuth();
  const navigate = useNavigate();
  const { messages, alerts } = useBadgeCounts(!!user);
  const [menuOpen, setMenuOpen] = useState(false);

  const isTutor = hasRole('TUTOR');
  const isAdmin = hasRole('ADMIN');

  const doLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <>
      {config?.showDemoBanner && <div className="demo-banner">{config.demoBannerText}</div>}
      <header className="nav">
        <div className="container nav-inner">
          <Link to="/" className="brand"><span className="dot" /> SkillSplore</Link>
          <nav className="nav-links">
            <NavLink to="/search" className="nav-link">Browse skills</NavLink>
            <NavLink to="/requests/new" className="nav-link">Post a request</NavLink>
            <Link to="/#how-it-works" className="nav-link">How it works</Link>
            {user && <NavLink to="/dashboard" className="nav-link">Dashboard</NavLink>}
            {user && <NavLink to="/requests" className="nav-link">My requests</NavLink>}
            {isTutor && <NavLink to="/tutor/feed" className="nav-link">Matching requests</NavLink>}
            {user && (
              <NavLink to="/messages" className="nav-link">
                Messages{messages > 0 && <span className="nav-badge">{messages}</span>}
              </NavLink>
            )}
            {user && (
              <NavLink to="/notifications" className="nav-link">
                Alerts{alerts > 0 && <span className="nav-badge">{alerts}</span>}
              </NavLink>
            )}
            {isAdmin && <NavLink to="/admin" className="nav-link">Admin</NavLink>}
            {!user && <NavLink to="/login" className="nav-link">Log in</NavLink>}
            {!user && <Link to="/register" className="btn btn-primary btn-sm">Sign up</Link>}
            {user && (
              <div style={{ position: 'relative' }}>
                <button className="btn btn-ghost btn-sm" onClick={() => setMenuOpen((o) => !o)} style={{ padding: 4 }}>
                  <Avatar name={user.displayName} url={user.avatarUrl} size={32} />
                </button>
                {menuOpen && (
                  <div className="card" style={{ position: 'absolute', right: 0, top: 42, width: 200, zIndex: 50 }} onClick={() => setMenuOpen(false)}>
                    <div className="card-body" style={{ padding: 10 }}>
                      <div style={{ padding: '4px 8px' }}><strong>{user.displayName}</strong><br /><small>{user.email}</small></div>
                      <div className="divider" style={{ margin: '8px 0' }} />
                      <Link className="nav-link" style={{ display: 'block' }} to="/account">Account</Link>
                      <Link className="nav-link" style={{ display: 'block' }} to="/tutor/onboarding">Teaching profile</Link>
                      <button className="nav-link" style={{ display: 'block', width: '100%', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer' }} onClick={doLogout}>Log out</button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </nav>
        </div>
      </header>
      <main className="page">
        <div className="container">{children}</div>
      </main>
      <footer className="site-footer">
        <div className="container">
          <div className="footer-inner">
            <div>
              <span className="brand" style={{ fontSize: '1.05rem' }}><span className="dot" /> SkillSplore</span>
              <p className="muted" style={{ fontSize: '0.85rem', margin: '8px 0 0', maxWidth: 360 }}>
                A moderated noticeboard that helps learners and people with useful knowledge or skills
                find each other. {ARRANGEMENT_DISCLAIMER}
              </p>
            </div>
            <nav className="footer-links">
              <Link to="/about">About</Link>
              <Link to="/#how-it-works">How it works</Link>
              <Link to="/search">Browse skills</Link>
              <Link to="/requests/new">Post a request</Link>
              <Link to="/tutor/onboarding">Teach on SkillSplore</Link>
              <Link to="/safety">Safety</Link>
              <Link to="/terms">Terms</Link>
              <Link to="/privacy">Privacy</Link>
            </nav>
          </div>
          <div className="footer-bottom muted">© {new Date().getFullYear()} SkillSplore</div>
        </div>
      </footer>
    </>
  );
}
