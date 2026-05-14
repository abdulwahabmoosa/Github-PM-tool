export default function ConnectedRepos({ repos, onDisconnect, loading }) {
  function roleBadge(role) {
    const cls = role === 'owner'
      ? 'bg-indigo-600 text-white'
      : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300';
    return (
      <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider flex-shrink-0 ${cls}`}>
        {role}
      </span>
    );
  }

  function disconnectMessage(repo) {
    if (repo.role === 'member') {
      return `Remove your access to ${repo.fullName}? Other team members keep access.`;
    }
    return `Disconnect ${repo.fullName}?\n\nIf you're the only member, the repo and all tasks will be deleted.\nIf other members exist, ownership transfers to the oldest member.`;
  }

  function handleDisconnect(repo) {
    if (window.confirm(disconnectMessage(repo))) {
      onDisconnect(repo.id);
    }
  }

  return (
    <section className="mb-8">
      <h2 className="text-base font-semibold text-slate-900 dark:text-slate-50 mb-3">
        Connected repositories
      </h2>

      {loading && (
        <p className="text-sm text-slate-500 dark:text-slate-400 italic">Loading…</p>
      )}

      {!loading && repos.length === 0 && (
        <p className="text-sm text-slate-500 dark:text-slate-400 italic">
          No repositories connected yet. Connect one from the list below.
        </p>
      )}

      <div className="divide-y divide-slate-200 dark:divide-slate-800">
        {repos.map((repo) => (
          <div key={repo.id} className="flex items-center gap-3 py-2.5">
            <span className="text-sm text-slate-900 dark:text-slate-50 font-medium flex-1 min-w-0 truncate">
              {repo.fullName}
            </span>
            {roleBadge(repo.role)}
            <span className="text-[11px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-1.5 py-0.5 rounded">
              {repo.private ? 'private' : 'public'}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400 hidden sm:block">
              {repo.defaultBranch}
            </span>
            <button
              onClick={() => handleDisconnect(repo)}
              className="flex-shrink-0 text-xs text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 border border-red-200 dark:border-red-900 hover:bg-red-50 dark:hover:bg-red-950/30 px-2.5 py-1 rounded-md transition-colors"
            >
              Disconnect
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}
