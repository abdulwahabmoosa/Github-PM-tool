export default function RepoBrowser({ githubRepos, connectedGithubIds, onConnect, loading, error, onRefresh }) {
  return (
    <section>
      <div className="flex items-center gap-3 mb-3">
        <h2 className="text-base font-semibold text-slate-900 dark:text-slate-50">
          Browse your GitHub repositories
        </h2>
        <button
          onClick={onRefresh}
          className="text-xs text-slate-600 dark:text-slate-400 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 px-2.5 py-1 rounded-md transition-colors"
        >
          Refresh
        </button>
      </div>

      {loading && (
        <p className="text-sm text-slate-500 dark:text-slate-400 italic">Loading…</p>
      )}
      {error && (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      )}

      {!loading && !error && githubRepos.length === 0 && (
        <p className="text-sm text-slate-500 dark:text-slate-400 italic py-4">
          No repositories found in your GitHub account.{' '}
          <button onClick={onRefresh} className="text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer">
            Refresh
          </button>
        </p>
      )}
      {!loading && !error && githubRepos.length > 0 && (
        <div className="divide-y divide-slate-200 dark:divide-slate-800">
          {githubRepos.map((repo) => {
            const isConnected = connectedGithubIds.has(String(repo.githubRepoId));
            return (
              <div key={repo.githubRepoId} className="flex items-center gap-3 py-2.5">
                <span className="text-sm text-slate-900 dark:text-slate-50 flex-1 min-w-0 truncate">
                  {repo.fullName}
                </span>
                <span className="text-[11px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-1.5 py-0.5 rounded">
                  {repo.private ? 'private' : 'public'}
                </span>
                {isConnected ? (
                  <span className="flex-shrink-0 text-xs bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900 px-2.5 py-1 rounded-md">
                    ✓ Connected
                  </span>
                ) : (
                  <button
                    onClick={() => onConnect(repo)}
                    className="flex-shrink-0 text-xs text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 px-2.5 py-1 rounded-md transition-colors"
                  >
                    Connect
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
