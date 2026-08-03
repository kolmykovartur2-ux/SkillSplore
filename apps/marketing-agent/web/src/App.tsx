import type { ReactNode } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useAuth } from './lib/auth.js';
import { Nav } from './components/Nav.js';
import { Spinner } from './components/ui.js';
import { Login } from './pages/Login.js';
import { Overview } from './pages/Overview.js';
import { Calendar } from './pages/Calendar.js';
import { Ideas } from './pages/Ideas.js';
import { Briefs } from './pages/Briefs.js';
import { BriefDetail } from './pages/BriefDetail.js';
import { Drafts } from './pages/Drafts.js';
import { DraftEditor } from './pages/DraftEditor.js';
import { ReviewQueue } from './pages/ReviewQueue.js';
import { Scheduled } from './pages/Scheduled.js';
import { Published } from './pages/Published.js';
import { Failed } from './pages/Failed.js';
import { Campaigns } from './pages/Campaigns.js';
import { Pillars } from './pages/Pillars.js';
import { Facts } from './pages/Facts.js';
import { Media } from './pages/Media.js';
import { Consents } from './pages/Consents.js';
import { LinkedInConnection } from './pages/LinkedInConnection.js';
import { Analytics } from './pages/Analytics.js';
import { AuditLog } from './pages/AuditLog.js';
import { Settings } from './pages/Settings.js';

function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <Spinner />;
  if (!user) return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  return <>{children}</>;
}

function Shell({ children }: { children: ReactNode }) {
  return (
    <>
      <Nav />
      {children}
    </>
  );
}

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/*"
        element={
          <RequireAuth>
            <Shell>
              <Routes>
                <Route path="/" element={<Overview />} />
                <Route path="/calendar" element={<Calendar />} />
                <Route path="/ideas" element={<Ideas />} />
                <Route path="/briefs" element={<Briefs />} />
                <Route path="/briefs/:id" element={<BriefDetail />} />
                <Route path="/drafts" element={<Drafts />} />
                <Route path="/drafts/:id" element={<DraftEditor />} />
                <Route path="/review-queue" element={<ReviewQueue />} />
                <Route path="/scheduled" element={<Scheduled />} />
                <Route path="/published" element={<Published />} />
                <Route path="/failed" element={<Failed />} />
                <Route path="/campaigns" element={<Campaigns />} />
                <Route path="/pillars" element={<Pillars />} />
                <Route path="/facts" element={<Facts />} />
                <Route path="/media" element={<Media />} />
                <Route path="/consents" element={<Consents />} />
                <Route path="/linkedin" element={<LinkedInConnection />} />
                <Route path="/analytics" element={<Analytics />} />
                <Route path="/audit-log" element={<AuditLog />} />
                <Route path="/settings" element={<Settings />} />
              </Routes>
            </Shell>
          </RequireAuth>
        }
      />
    </Routes>
  );
}
