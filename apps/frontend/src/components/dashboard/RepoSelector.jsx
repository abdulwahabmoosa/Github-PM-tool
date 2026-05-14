import { cn } from '../../lib/cn.js';

export default function RepoSelector({ repos, selectedRepoId, onSelect, onManage }) {
  return (
    <div className="flex gap-1 mb-5 border-b border-slate-200 dark:border-slate-800">
      {repos.map((repo) => {
        const active = repo.id === selectedRepoId;
        return (
          <button
            key={repo.id}
            onClick={() => onSelect(repo.id)}
            title={repo.fullName}
            className={cn(
              'px-3.5 py-2 text-sm border-b-2 -mb-px transition-colors max-w-[220px] overflow-hidden text-ellipsis whitespace-nowrap',
              active
                ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400 font-medium'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-50',
            )}
          >
            {repo.name}
            {repo.role === 'owner' && (
              <span className="inline-flex items-center px-1.5 py-0.5 ml-1.5 text-[10px] font-medium bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 rounded uppercase tracking-wide">
                OWNER
              </span>
            )}
            {repo.role === 'member' && (
              <span className="inline-flex items-center px-1.5 py-0.5 ml-1.5 text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded uppercase tracking-wide">
                MEMBER
              </span>
            )}
          </button>
        );
      })}
      <button
        onClick={onManage}
        className="text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 px-2.5 py-1 text-xs rounded-md transition-colors ml-1 self-center"
      >
        + Manage repos
      </button>
    </div>
  );
}
