import { Link } from 'react-router-dom';

function relTime(iso) {
  if (!iso) return 'never polled';
  const ms = Date.now() - new Date(iso).getTime();
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  return `${Math.floor(s / 3600)}h ago`;
}

export default function RepoToolbar({ repo, onPollNow, onNewTask, polling, tick, canCreateTask = true }) {
  void tick;
  const syncState = repo.syncState;

  return (
    <div className="flex items-start justify-between mb-4">
      <div>
        <h2 className="text-base font-medium text-slate-900 dark:text-slate-50">{repo.fullName}</h2>
        <div className="flex items-center gap-2 mt-1 text-xs text-slate-500 dark:text-slate-400 flex-wrap">
          <span>Last polled: {relTime(syncState?.lastPolledAt)}</span>
          {syncState?.lastPollStatus === 'RATE_LIMITED' && (
            <span className="text-amber-600 dark:text-amber-400">· ⚠ GitHub rate limit reached, polling paused</span>
          )}
          {syncState?.lastPollStatus && syncState.lastPollStatus !== 'OK' && syncState.lastPollStatus !== 'RATE_LIMITED' && (
            <span className="text-red-600 dark:text-red-400">· {syncState.lastPollStatus}</span>
          )}
          <button
            onClick={onPollNow}
            disabled={polling}
            className="text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 px-2.5 py-1 text-xs rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {polling ? 'Polling…' : 'Poll now'}
          </button>
        </div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <Link
          to={`/repos/${repo.id}/settings`}
          className="text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-50 transition-colors px-2.5 py-2"
        >
          Settings
        </Link>
        {canCreateTask && (
          <button
            onClick={onNewTask}
            className="bg-slate-900 dark:bg-slate-50 text-white dark:text-slate-900 hover:bg-slate-700 dark:hover:bg-slate-200 px-3.5 py-2 text-sm font-medium rounded-md transition-colors"
          >
            + New task
          </button>
        )}
      </div>
    </div>
  );
}
