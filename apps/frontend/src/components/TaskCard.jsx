import { cn } from '../lib/cn.js';

function relativeTime(iso) {
  if (!iso) return null;
  const ms = Date.now() - new Date(iso).getTime();
  const s = Math.floor(ms / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

const STATUS_BORDERS = {
  OPEN:        'border-l-slate-400 dark:border-l-slate-600',
  TO_DO:       'border-l-indigo-500 dark:border-l-indigo-600',
  IN_PROGRESS: 'border-l-amber-500 dark:border-l-amber-600',
  HELP_NEEDED: 'border-l-red-500 dark:border-l-red-600',
  IN_REVIEW:   'border-l-blue-500 dark:border-l-blue-600',
  DONE:        'border-l-emerald-500 dark:border-l-emerald-600',
};

export default function TaskCard({ task, onClick }) {
  const borderClass = STATUS_BORDERS[task.status] ?? 'border-l-slate-400';
  const isDone = task.status === 'DONE';

  const overrideRemainingMs = task.override?.until
    ? Math.max(0, new Date(task.override.until).getTime() - Date.now())
    : 0;
  const overrideActive = overrideRemainingMs > 0;

  const metaParts = [task.assignee ?? 'unassigned'];
  if (task.branch) metaParts.push(`· ${task.branch}`);
  if (task.linkedIssueNumber) metaParts.push(`· #${task.linkedIssueNumber}`);

  const primaryCommand = task.availableCommands?.find((c) => c.primary) ?? null;

  return (
    <div
      onClick={onClick}
      className={cn(
        'relative bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800',
        'rounded-md border-l-4 cursor-pointer',
        'hover:bg-slate-100 dark:hover:bg-slate-800/70 hover:ring-1 hover:ring-slate-300 dark:hover:ring-slate-700 transition-all duration-150 p-3',
        borderClass,
        isDone && 'opacity-70',
      )}
    >
      <p className="text-sm font-medium text-slate-900 dark:text-slate-50">
        <span className="text-xs text-slate-400 dark:text-slate-500 mr-1.5">
          #{task.repoTaskNumber}
        </span>
        {task.title}
      </p>
      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
        {metaParts.join(' ')}
        {task.needsHelp && (
          <span className="text-amber-700 dark:text-amber-400"> · 🙋 needs help</span>
        )}
      </p>
      {overrideActive && (
        <p className="inline-flex items-center gap-1 mt-1.5 px-1.5 py-0.5 text-[11px] bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400 rounded border border-red-200 dark:border-red-900">
          🔒 Override active · automation resumes in {Math.ceil(overrideRemainingMs / 60000)}m
        </p>
      )}
      {task.activity?.commitCount > 0 && (
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          <strong className="font-medium text-slate-700 dark:text-slate-300">
            {task.activity.commitCount}
          </strong>{' '}
          {task.activity.commitCount === 1 ? 'commit' : 'commits'}
          {task.activity.lastCommitAt && (
            <> · last {relativeTime(task.activity.lastCommitAt)}</>
          )}
        </p>
      )}
      {primaryCommand && (
        <div className="mt-2 flex items-center gap-2">
          <code className="flex-1 font-mono text-xs bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2 py-1 rounded overflow-hidden text-ellipsis whitespace-nowrap">
            {primaryCommand.command}
          </code>
          <button
            className="flex-shrink-0 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 px-2.5 py-1 text-xs rounded-md transition-colors"
            onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(primaryCommand.command); }}
          >
            Copy
          </button>
        </div>
      )}
    </div>
  );
}
