import { useTheme } from '../../hooks/useTheme.js';

export default function DashboardHeader({ user, onLogout }) {
  const { mode, cycle } = useTheme();
  const initial = user.githubLogin?.[0]?.toUpperCase() ?? '?';

  const themeIcon  = mode === 'light' ? '☀' : mode === 'dark' ? '☾' : '⌘';
  const themeLabel = mode === 'light' ? 'Light' : mode === 'dark' ? 'Dark' : 'System';

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
