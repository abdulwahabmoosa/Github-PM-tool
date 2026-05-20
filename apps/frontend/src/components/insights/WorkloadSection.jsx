import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts';
import { useTheme } from '../../hooks/useTheme.js';

const CARD = 'bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-lg p-5';

const STATUS_COLORS = {
  IN_PROGRESS: '#f59e0b',
  HELP_NEEDED: '#ef4444',
  IN_REVIEW:   '#3b82f6',
  TO_DO:       '#6366f1',
  OPEN:        '#94a3b8',
  DONE:        '#10b981',
};

const STATUS_LABELS = {
  IN_PROGRESS: 'In progress',
  HELP_NEEDED: 'Help needed',
  IN_REVIEW:   'In review',
  TO_DO:       'To do',
  OPEN:        'Open',
  DONE:        'Done',
};

const STACK_ORDER = ['DONE', 'IN_REVIEW', 'IN_PROGRESS', 'TO_DO', 'HELP_NEEDED', 'OPEN'];

function relDays(iso) {
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (d === 0) return 'today';
  if (d === 1) return '1 day ago';
  return `${d} days ago`;
}

const STATUS_PILL = {
  IN_PROGRESS: 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400',
  HELP_NEEDED: 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400',
  IN_REVIEW:   'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400',
};

function isDarkMode(mode) {
  return mode === 'dark' ||
    (mode === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
}

export default function WorkloadSection({ tasksPerAssignee, averageTimeInProgress, stuckTasks }) {
  const { mode } = useTheme();
  const dark = isDarkMode(mode);

  const textColor  = dark ? '#94a3b8' : '#64748b';
  const gridColor  = dark ? '#27272a' : '#e2e8f0';

  const tooltipStyle = {
    background: dark ? '#1e293b' : '#fff',
    border: `1px solid ${dark ? '#334155' : '#e2e8f0'}`,
    borderRadius: 6,
    fontSize: 12,
    color: dark ? '#f8fafc' : '#0f172a',
  };

  const hasAssignees = tasksPerAssignee?.length > 0;
  const hasStuck     = stuckTasks?.length > 0;

  // Which statuses actually appear in the data
  const presentStatuses = STACK_ORDER.filter((s) =>
    tasksPerAssignee?.some((r) => r[s] > 0)
  );

  return (
    <div className={CARD}>
      <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-5">
        Workload
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        {/* ── Tasks per assignee ── */}
        <div className="md:col-span-2">
          <p className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-3">
            Tasks per person
          </p>
          <div className="h-44">
            {!hasAssignees ? (
              <div className="flex items-center justify-center h-full">
                <p className="text-xs text-slate-400 dark:text-slate-500 italic">No tasks yet</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={tasksPerAssignee}
                  layout="vertical"
                  margin={{ top: 0, right: 4, bottom: 0, left: 4 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke={gridColor} horizontal={false} />
                  <XAxis
                    type="number"
                    tick={{ fontSize: 9, fill: textColor }}
                    tickLine={false}
                    axisLine={false}
                    allowDecimals={false}
                  />
                  <YAxis
                    type="category"
                    dataKey="login"
                    tick={{ fontSize: 10, fill: textColor }}
                    tickLine={false}
                    axisLine={false}
                    width={80}
                    tickFormatter={(v) => v.length > 12 ? `${v.slice(0, 11)}…` : v}
                  />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(v, name) => [v, STATUS_LABELS[name] ?? name]}
                  />
                  {presentStatuses.map((s) => (
                    <Bar
                      key={s}
                      dataKey={s}
                      name={s}
                      stackId="a"
                      fill={STATUS_COLORS[s]}
                      maxBarSize={20}
                    />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* ── Average time to done ── */}
        <div className="flex flex-col justify-center items-center bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-4 text-center">
          <p className="text-[10px] uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-2">
            Avg. claim → done
          </p>
          <p className="text-3xl font-medium text-slate-900 dark:text-slate-50 leading-tight">
            {averageTimeInProgress ?? 'no data'}
          </p>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">per task</p>
        </div>
      </div>

      {/* ── Stuck tasks ── */}
      <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
        <p className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-3">
          Stuck tasks{' '}
          <span className="font-normal text-slate-400 dark:text-slate-500">(no update in 7+ days)</span>
        </p>
        {!hasStuck ? (
          <p className="text-xs text-emerald-600 dark:text-emerald-400 italic">
            No stuck tasks. Everything is moving.
          </p>
        ) : (
          <div className="space-y-1.5">
            {stuckTasks.map((t) => (
              <div
                key={t.id}
                className="flex items-center gap-3 py-1.5 border-b border-slate-100 dark:border-slate-900 last:border-0"
              >
                <span className="text-xs text-slate-400 dark:text-slate-500 flex-shrink-0 font-mono">
                  #{t.repoTaskNumber}
                </span>
                <span className="flex-1 text-sm text-slate-700 dark:text-slate-300 truncate">
                  {t.title}
                </span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium flex-shrink-0 ${STATUS_PILL[t.status] ?? 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'}`}>
                  {STATUS_LABELS[t.status] ?? t.status}
                </span>
                {t.assignee && (
                  <span className="text-xs text-slate-400 dark:text-slate-500 flex-shrink-0 hidden sm:block">
                    @{t.assignee}
                  </span>
                )}
                <span className="text-xs text-slate-400 dark:text-slate-500 flex-shrink-0">
                  {relDays(t.updatedAt)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
