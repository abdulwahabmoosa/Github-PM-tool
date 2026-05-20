import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth.js';
import Landing from './pages/Landing.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Docs from './pages/Docs.jsx';
import Insights from './pages/Insights.jsx';
import RepoSettings from './pages/RepoSettings.jsx';
import Notifications from './pages/Notifications.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';

export default function App() {
  const { user, loading, logout } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-[#1a1a1a]">
        <span className="text-sm text-slate-400 dark:text-slate-500">Loading…</span>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={user ? <Navigate to="/dashboard" replace /> : <Landing />}
        />
        <Route path="/docs" element={<Docs />} />
        <Route
          path="/dashboard"
          element={
            <ErrorBoundary>
              {user ? <Dashboard user={user} onLogout={logout} /> : <Navigate to="/" replace />}
            </ErrorBoundary>
          }
        />
        <Route
          path="/insights"
          element={
            <ErrorBoundary>
              {user ? <Insights user={user} onLogout={logout} /> : <Navigate to="/" replace />}
            </ErrorBoundary>
          }
        />
        <Route
          path="/repos/:repoId/settings"
          element={
            <ErrorBoundary>
              {user ? <RepoSettings user={user} onLogout={logout} /> : <Navigate to="/" replace />}
            </ErrorBoundary>
          }
        />
        <Route
          path="/notifications"
          element={
            <ErrorBoundary>
              {user ? <Notifications user={user} onLogout={logout} /> : <Navigate to="/" replace />}
            </ErrorBoundary>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
