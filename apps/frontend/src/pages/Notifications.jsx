import { useNavigate } from 'react-router-dom';
import { useNotifications } from '../hooks/useNotifications.js';
import { useDocumentTitle } from '../hooks/useDocumentTitle.js';
import DashboardHeader from '../components/dashboard/DashboardHeader.jsx';
import Skeleton from '../components/Skeleton.jsx';

function relTime(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function Notifications({ user, onLogout }) {
  const navigate = useNavigate();
  const { notifications, unreadCount, loading, markRead, markAllRead } = useNotifications(50);
  useDocumentTitle('Notifications');

  function handleClick(n) {
    if (!n.readAt) markRead(n.id);
    if (n.linkTo) navigate(n.linkTo);
  }

  return (
    <div className="max-w-3xl mx-auto px-5 py-6">
      <DashboardHeader user={user} onLogout={onLogout} />

      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-medium text-slate-900 dark:text-slate-50">
            Notifications
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {unreadCount > 0 && (
            <button
              onClick={markAllRead}
              className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
            >
              Mark all read
            </button>
          )}
          <button
            onClick={() => navigate('/dashboard')}
            className="text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-50"
          >
            ← Back
          </button>
        </div>
      </div>

      {loading && notifications.length === 0 ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-md" />
          ))}
        </div>
      ) : notifications.length === 0 ? (
        <div className="py-12 text-center">
          <div className="text-3xl mb-2 opacity-40">🔔</div>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            No notifications yet. They'll appear here when things happen.
          </p>
        </div>
      ) : (
        <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
          {notifications.map((n) => (
            <button
              key={n.id}
              onClick={() => handleClick(n)}
              className={`block w-full text-left p-4 hover:bg-white dark:hover:bg-slate-800/70 transition-colors border-b border-slate-200 dark:border-slate-800 last:border-b-0 ${
                !n.readAt ? 'bg-white dark:bg-slate-950/40' : ''
              }`}
            >
              <div className="flex items-start gap-3">
                {!n.readAt && (
                  <span className="w-2 h-2 rounded-full bg-indigo-500 flex-shrink-0 mt-1.5" />
                )}
                <div className={`flex-1 min-w-0 ${n.readAt ? 'pl-5' : ''}`}>
                  <p className={`text-sm ${!n.readAt ? 'font-medium' : ''} text-slate-900 dark:text-slate-50`}>
                    {n.title}
                  </p>
                  {n.body && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      {n.body}
                    </p>
                  )}
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">
                    {relTime(n.createdAt)}
                  </p>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
