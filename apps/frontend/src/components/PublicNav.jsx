import { Link, useLocation } from 'react-router-dom';
import { useTheme } from '../hooks/useTheme.js';

export default function PublicNav() {
  const { pathname } = useLocation();
  const { mode, cycle } = useTheme();

  const themeIcon  = mode === 'light' ? '☀' : mode === 'dark' ? '☾' : '⌘';
  const themeLabel = mode === 'light' ? 'Light' : mode === 'dark' ? 'Dark' : 'System';

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-[#1a1a1a]/80 backdrop-blur-sm">
      <div className="max-w-6xl mx-auto px-5 h-14 flex items-center gap-5">
        <Link to="/" className="flex items-center gap-2 mr-auto">
          <img src="/favicon.svg" alt="TaskMaster logo" className="w-6 h-6 rounded flex-shrink-0" />
          <span className="text-sm font-semibold text-slate-900 dark:text-slate-50">TaskMaster</span>
        </Link>

        <Link
          to="/docs"
          className={
            pathname === '/docs'
              ? 'text-sm font-medium text-indigo-600 dark:text-indigo-400'
              : 'text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-50 transition-colors'
          }
        >
          Docs
        </Link>

        <a
          href="https://github.com/abdulwahabmoosa/Github-PM-tool"
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-50 transition-colors"
        >
          GitHub
        </a>

        <button
          onClick={cycle}
          className="flex items-center gap-1.5 px-2 py-1 text-xs text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors"
          title={`Theme: ${themeLabel}. Click to cycle.`}
        >
          <span className="text-sm leading-none">{themeIcon}</span>
          <span className="hidden sm:inline">{themeLabel}</span>
        </button>
      </div>
    </header>
  );
}
