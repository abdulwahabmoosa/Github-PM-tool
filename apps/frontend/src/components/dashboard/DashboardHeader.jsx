import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../../hooks/useTheme.js';
import { useNotifications } from '../../hooks/useNotifications.js';

function relTime(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function DashboardHeader({ user, onLogout }) {
  const { mode, cycle } = useTheme();
  const navigate = useNavigate();
  const { notifications, unreadCount, markRead, markAllRead } = useNotifications(10);

  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);

  const initial = user.githubLogin?.[0]?.toUpperCase() ?? '?';
  const themeIcon  = mode === 'light' ? '☀' : mode === 'dark' ? '☾' : '⌘';
  const themeLabel = mode === 'light' ? 'Light' : mode === 'dark' ? 'Dark' : 'System';

  // Close dropdown when clicking outside or pressing Esc
  useEffect(() => {
    if (!showDropdown) return;
    function handleClick(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    }
    function handleKey(e) {
      if (e.key === 'Escape') setShowDropdown(false);
    }
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [showDropdown]);

  return (
    <header className="flex items-center gap-3 pb-4 mb-6 border-b border-slate-200 dark:border-slate-800">
      {user.avatarUrl ? (
        <img src={user.avatarUrl} alt="" className="w-8 h-8 rounded-full" />
      ) : (
        <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-medium">
          {initial}
        </div>
      )}
      <span className="text-sm text-slate-700 dark:text-slate-300">
        Hi, <strong className="font-medium text-slate-900 dark:text-slate-50">{user.githubLogin}</strong>
      </span>

      <div className="ml-auto flex items-center gap-2">
        {/* Bell */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setShowDropdown((v) => !v)}
            className="relative p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            aria-label="Notifications"
          >
            <span className="text-base leading-none">🔔</span>
            {unreadCount > 0 && (
              <span className="absolute top-0 right-0 inline-flex items-center justify-center w-4 h-4 text-[10px] font-bold bg-red-500 text-white rounded-full">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {showDropdown && (
            <div className="absolute right-0 top-full mt-1 w-80 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-lg z-50">
              {/* Header */}
              <div className="flex items-center justify-between px-3 py-2 border-b border-slate-100 dark:border-slate-800">
                <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  Notifications
                </span>
                {unreadCount > 0 && (
                  <button
                    onClick={() => { markAllRead(); }}
                    className="text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline"
                  >
                    Mark all read
                  </button>
                )}
              </div>

              {/* List */}
              <div className="max-h-80 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="py-8 text-center">
                    <div className="text-2xl mb-1.5 opacity-40">🔔</div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      No notifications yet.
                    </p>
                  </div>
                ) : (
                  notifications.map((n) => (
                    <button
                      key={n.id}
                      onClick={() => {
                        if (!n.readAt) markRead(n.id);
                        if (n.linkTo) navigate(n.linkTo);
                        setShowDropdown(false);
                      }}
                      className={`block w-full text-left px-3 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors border-b border-slate-100 dark:border-slate-800/60 last:border-b-0 ${
                        !n.readAt ? 'bg-indigo-50/30 dark:bg-indigo-950/20' : ''
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        {!n.readAt && (
                          <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 flex-shrink-0 mt-1.5" />
                        )}
                        <div className={`flex-1 min-w-0 ${n.readAt ? 'pl-3.5' : ''}`}>
                          <p className="text-sm text-slate-900 dark:text-slate-50 truncate">
                            {n.title}
                          </p>
                          {n.body && (
                            <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                              {n.body}
                            </p>
                          )}
                          <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">
                            {relTime(n.createdAt)}
                          </p>
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </div>

              {/* Footer */}
              <div className="px-3 py-2 border-t border-slate-100 dark:border-slate-800 text-center">
                <button
                  onClick={() => { navigate('/notifications'); setShowDropdown(false); }}
                  className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  See all →
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Theme toggle */}
        <button
          onClick={cycle}
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors"
          title={`Theme: ${themeLabel}. Click to cycle.`}
        >
          <span className="text-base leading-none">{themeIcon}</span>
          <span>{themeLabel}</span>
        </button>
        <button
          onClick={onLogout}
          className="px-3 py-1.5 text-xs text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 rounded-md hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors"
        >
          Logout
        </button>
      </div>
    </header>
  );
}
