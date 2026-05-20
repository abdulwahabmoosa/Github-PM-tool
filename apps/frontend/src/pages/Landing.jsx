import { Link } from 'react-router-dom';
import PublicNav from '../components/PublicNav.jsx';
import { useDocumentTitle } from '../hooks/useDocumentTitle.js';

const VERBS = ['claim', 'help', 'helping', 'review', 'done'];

function TerminalLine({ prompt, command, args, output }) {
  if (output) {
    return (
      <div className="flex items-start gap-2">
        <span className="text-emerald-400 flex-shrink-0">→</span>
        <span className="text-slate-300">{output}</span>
      </div>
    );
  }
  return (
    <div className="flex items-start gap-2">
      <span className="text-slate-500 flex-shrink-0">$</span>
      <span>
        <span className="text-slate-200">{command}</span>
        {args && <span className="text-amber-300"> {args}</span>}
      </span>
    </div>
  );
}

export default function Landing() {
  useDocumentTitle(null);

  function handleLogin() {
    window.location.href = `${import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000'}/auth/github`;
  }

  return (
    <div className="min-h-screen bg-white dark:bg-[#1a1a1a]">
      <PublicNav />

      {/* ── Hero ── */}
      <section className="max-w-3xl mx-auto px-5 py-24 text-center">
        <h1 className="text-4xl sm:text-5xl font-medium text-slate-900 dark:text-slate-50 tracking-tight leading-tight mb-5">
          Your git workflow,<br className="hidden sm:block" /> your project board.
        </h1>
        <p className="text-lg text-slate-600 dark:text-slate-400 leading-relaxed max-w-xl mx-auto mb-10">
          TaskMaster watches your repo. Push a tag, your task moves.
          No webhooks, no context switching.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={handleLogin}
            className="inline-flex items-center justify-center gap-2 bg-slate-900 dark:bg-slate-50 text-white dark:text-slate-900 hover:bg-slate-700 dark:hover:bg-slate-200 px-5 py-2.5 text-sm font-medium rounded-lg transition-colors"
          >
            <svg className="w-4 h-4" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
            </svg>
            Continue with GitHub
          </button>
          <Link
            to="/docs"
            className="inline-flex items-center justify-center px-5 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-colors"
          >
            Read the docs
          </Link>
        </div>
      </section>

      {/* ── Terminal Demo ── */}
      <section className="max-w-2xl mx-auto px-5 mb-16">
        <div className="rounded-xl bg-slate-900 border border-slate-800 overflow-hidden shadow-2xl">
          {/* Window bar */}
          <div className="flex items-center gap-1.5 px-4 py-3 border-b border-slate-800">
            <span className="w-3 h-3 rounded-full bg-red-500/80" />
            <span className="w-3 h-3 rounded-full bg-amber-500/80" />
            <span className="w-3 h-3 rounded-full bg-emerald-500/80" />
            <span className="ml-3 text-xs text-slate-500 font-mono">zsh — repo/my-project</span>
          </div>
          {/* Code lines */}
          <div className="px-4 py-4 font-mono text-sm space-y-1.5">
            <TerminalLine command='git commit' args='-m "refactor auth module"' />
            <TerminalLine command='git tag' args='-a task-3-claim -m "claim"' />
            <TerminalLine command='git push' args='--tags' />
            <div className="pt-1" />
            <TerminalLine output="task #3 claimed by you" />
            <TerminalLine output="status: open → in progress" />
          </div>
        </div>
        <p className="text-center text-xs text-slate-500 dark:text-slate-500 mt-3">
          Tags are detected within 30 seconds. No setup required.
        </p>
      </section>

      {/* ── Dashboard screenshot ── */}
      <section className="max-w-5xl mx-auto px-5 mb-16">
        <div className="bg-slate-100 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-2 shadow-2xl">
          <img
            src="/screenshots/dashboard-light.png.png"
            alt="TaskMaster dashboard"
            className="rounded-lg w-full block dark:hidden"
          />
          <img
            src="/screenshots/dashboard-dark.png.png"
            alt="TaskMaster dashboard in dark mode"
            className="rounded-lg w-full hidden dark:block"
          />
        </div>
      </section>

      {/* ── Verbs strip ── */}
      <section className="max-w-3xl mx-auto px-5 mb-20 text-center">
        <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
          Five tag verbs drive your workflow:
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          {VERBS.map((v) => (
            <code
              key={v}
              className="font-mono text-sm bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2.5 py-1 rounded border border-slate-200 dark:border-slate-700"
            >
              {v}
            </code>
          ))}
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-slate-200 dark:border-slate-800 py-8">
        <div className="max-w-6xl mx-auto px-5 flex flex-col sm:flex-row items-center gap-4">
          <div className="flex items-center gap-2">
            <img src="/favicon.svg" alt="TaskMaster logo" className="w-5 h-5 rounded flex-shrink-0" />
            <span className="text-sm font-semibold text-slate-900 dark:text-slate-50">TaskMaster</span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-500 sm:ml-4">
            Built as a final-year dissertation project.
          </p>
          <div className="sm:ml-auto flex items-center gap-4">
            <Link to="/docs" className="text-xs text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-50 transition-colors">
              Docs
            </Link>
            <a
              href="https://github.com/abdulwahabmoosa/Github-PM-tool"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-50 transition-colors"
            >
              GitHub
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
