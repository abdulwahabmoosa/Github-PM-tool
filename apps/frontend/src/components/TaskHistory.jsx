import { cn } from '../lib/cn.js';

const STATUS_PILL = {
  OPEN:        'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400',
  TO_DO:       'bg-indigo-50 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-400',
  IN_PROGRESS: 'bg-amber-50 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400',
  HELP_NEEDED: 'bg-red-50 dark:bg-red-900/40 text-red-700 dark:text-red-400',
  IN_REVIEW:   'bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400',
  DONE:        'bg-emerald-50 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400',
};

const STATUS_LABELS = {
  OPEN: 'Open', TO_DO: 'To do', IN_PROGRESS: 'In progress',
  HELP_NEEDED: 'Help needed', IN_REVIEW: 'In review', DONE: 'Done',
};

function relativeTime(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return 'just now';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
}

function StatusPill({ status }) {
  if (!status) return null;
  return (
    <span className={cn('inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium', STATUS_PILL[status] ?? 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400')}>
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}

function rowIconClass(row) {
  if (row.triggerType === 'TASK_CREATED') return { symbol: '+', cls: 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400' };
  if (row.note?.startsWith('skipped:'))   return { symbol: '✕', cls: 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500' };
  if (row.triggerType === 'MANUAL')       return { symbol: '⟳', cls: 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400' };
  return                                         { symbol: '→', cls: 'bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400' };
}

export default function TaskHistory({ history, loading, error }) {
  if (loading) return <p className="text-xs text-slate-400 dark:text-slate-500 italic">Loading history…</p>;
  if (error)   return <p className="text-xs text-red-600 dark:text-red-400">Failed to load history: {error}</p>;
  if (!history || history.length === 0) return <p className="text-xs text-slate-400 dark:text-slate-500 italic">No history yet</p>;

  return (
    <div>
      {history.map((row, i) => {
        const isSkip = row.note?.startsWith('skipped:');
        const isTransition = row.fromStatus !== row.toStatus;
        const { symbol, cls } = rowIconClass(row);
        const isLast = i === history.length - 1;

        return (
          <div key={row.id} className={cn('flex gap-3 py-2', isSkip && 'opacity-70')}>
            {/* left column: icon + connector */}
            <div className="flex flex-col items-center flex-shrink-0">
              <div className={cn('w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium', cls)}>
                {symbol}
              </div>
              {!isLast && <div className="w-px flex-1 bg-slate-200 dark:bg-slate-700 my-1" />}
            </div>

            {/* right column */}
            <div className="flex-1 pb-3 min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                {row.triggerType === 'TASK_CREATED' ? (
                  <span className="text-sm font-medium text-slate-900 dark:text-slate-50">Task created</span>
                ) : isTransition ? (
                  <>
                    <StatusPill status={row.fromStatus} />
                    <span className="text-xs text-slate-400 dark:text-slate-500">→</span>
                    <StatusPill status={row.toStatus} />
                  </>
                ) : (
                  <StatusPill status={row.toStatus} />
                )}
                {row.triggerVerb && (
                  <code className="font-mono text-xs bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-slate-700 dark:text-slate-300">
                    {row.triggerVerb}
                  </code>
                )}
              </div>
              <div className="flex gap-2 mt-0.5 flex-wrap text-xs text-slate-500 dark:text-slate-400">
                {row.actorLogin && <span>@{row.actorLogin}</span>}
                {row.triggerRef && (
                  <span className="font-mono">{row.triggerRef.slice(0, 8)}</span>
                )}
                <span title={row.createdAt}>{relativeTime(row.createdAt)}</span>
              </div>
              {isSkip && (
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 italic">
                  {row.note.replace('skipped: ', '')}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
