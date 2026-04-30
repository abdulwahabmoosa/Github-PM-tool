import { useAuth } from './hooks/useAuth.js';
import Landing from './pages/Landing.jsx';
import Dashboard from './pages/Dashboard.jsx';

export default function App() {
  const { user, loading, logout } = useAuth();
  if (loading) return <div style={{ padding: 32, fontFamily: 'system-ui' }}>Loading...</div>;
  if (!user) return <Landing />;
  return <Dashboard user={user} onLogout={logout} />;
}
