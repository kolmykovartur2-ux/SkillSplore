import { NavLink } from 'react-router-dom';

const LINKS: Array<[string, string]> = [
  ['/admin', 'Overview'],
  ['/admin/applications', 'Applications'],
  ['/admin/users', 'Users'],
  ['/admin/reports', 'Reports'],
  ['/admin/reviews', 'Reviews'],
  ['/admin/taxonomy', 'Taxonomy'],
  ['/admin/subject-suggestions', 'Suggestions'],
  ['/admin/audit', 'Audit log'],
];

export function AdminNav() {
  return (
    <nav className="row-wrap" style={{ marginBottom: 20, borderBottom: '1px solid var(--border)', paddingBottom: 10 }}>
      {LINKS.map(([to, label]) => (
        <NavLink key={to} to={to} end={to === '/admin'} className="nav-link">{label}</NavLink>
      ))}
    </nav>
  );
}
