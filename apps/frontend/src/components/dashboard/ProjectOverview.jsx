import Skeleton from '../Skeleton.jsx';

function StatCol({ label, value, numberClass, loading }) {
  return (
    <div className="flex-1 min-w-[80px] text-center">
      {loading ? (
        <Skeleton className="h-7 w-12 mx-auto mb-1" />
      ) : (
        <p className={`text-2xl font-medium ${numberClass ?? 'text-slate-900 dark:text-slate-50'}`}>
          {value ?? '—'}
        </p>
      )}
      <p className="text-[10px] uppercase tracking-wider mt-1 text-slate-500 dark:text-slate-400">
        {label}
      </p>
    </div>
  );
}

export default function ProjectOverview({ stats }) {
  const loading = stats === null || stats === undefined;
  return (
    <div className="bg-slate-100 dark:bg-slate-900 rounded-lg p-4 mb-6 flex gap-4 flex-wrap">
      <StatCol label="Tasks"        value={stats?.total}           loading={loading} />
      <StatCol label="In progress"  value={stats?.inProgress}      loading={loading} numberClass="text-amber-700 dark:text-amber-400" />
      <StatCol label="Need help"    value={stats?.needHelp}        loading={loading} numberClass="text-red-700 dark:text-red-400" />
      <StatCol label="Unclaimed"    value={stats?.unclaimed}       loading={loading} numberClass="text-slate-600 dark:text-slate-400" />
      <StatCol label="Commits / wk" value={stats?.commitsThisWeek} loading={loading} />
    </div>
  );
}
