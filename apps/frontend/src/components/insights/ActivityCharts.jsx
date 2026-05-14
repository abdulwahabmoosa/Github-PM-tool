import {
  BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { useTheme } from '../../hooks/useTheme.js';

const CARD = 'bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-lg p-5';

function isDarkMode(mode) {
  return mode === 'dark' ||
    (mode === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
}

function ChartEmpty({ label }) {
  return (
    <div className="flex items-center justify-center h-full">
      <p className="text-xs text-slate-400 dark:text-slate-500 italic">{label}</p>
    </div>
  );
}

export default function ActivityCharts({ commitsByDay, tasksCompletedByWeek, topContributors }) {
  const { mode } = useTheme();
  const dark = isDarkMode(mode);

  const textColor  = dark ? '#94a3b8' : '#64748b';
  const gridColor  = dark ? '#27272a' : '#e2e8f0';
  const accent     = '#6366f1';
  const emerald    = '#10b981';

  const tooltipStyle = {
    background: dark ? '#1e293b' : '#fff',
    border: `1px solid ${dark ? '#334155' : '#e2e8f0'}`,
    borderRadius: 6,
    fontSize: 12,
    color: dark ? '#f8fafc' : '#0f172a',
  };

  const hasCommits   = commitsByDay?.some((d) => d.count > 0);
  const hasCompleted = tasksCompletedByWeek?.length > 0;
  const hasContribs  = topContributors?.length > 0;

  return (
    <div className={CARD}>
      <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-5">
        Activity
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* ── Commits per day ── */}
        <div>
          <p className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-3">
            Commits per day <span className="font-normal text-slate-400 dark:text-slate-500">(last 14 days)</span>
          </p>
          <div className="h-36">
            {!hasCommits ? (
              <ChartEmpty label="No commits in this period" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={commitsByDay} margin={{ top: 2, right: 4, bottom: 0, left: -28 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 9, fill: textColor }}
                    tickFormatter={(d) => d.slice(5).replace('-', '/')}
                    tickLine={false}
                    interval={1}
                  />
                  <YAxis
                    tick={{ fontSize: 9, fill: textColor }}
                    tickLine={false}
                    axisLine={false}
                    allowDecimals={false}
                    width={28}
                  />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    labelFormatter={(d) => d}
                    formatter={(v) => [v, 'commits']}
                  />
                  <Bar dataKey="count" fill={accent} radius={[2, 2, 0, 0]} maxBarSize={18} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* ── Tasks completed per week ── */}
        <div>
          <p className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-3">
            Tasks completed per week <span className="font-normal text-slate-400 dark:text-slate-500">(last 8 weeks)</span>
          </p>
          <div className="h-36">
            {!hasCompleted ? (
              <ChartEmpty label="No completed tasks yet" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={tasksCompletedByWeek} margin={{ top: 2, right: 4, bottom: 0, left: -28 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                  <XAxis
                    dataKey="weekStart"
                    tick={{ fontSize: 9, fill: textColor }}
                    tickFormatter={(d) => d.slice(5).replace('-', '/')}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 9, fill: textColor }}
                    tickLine={false}
                    axisLine={false}
                    allowDecimals={false}
                    width={28}
                  />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    labelFormatter={(d) => `Week of ${d}`}
                    formatter={(v) => [v, 'completed']}
                  />
                  <Line
                    type="monotone"
                    dataKey="count"
                    stroke={emerald}
                    strokeWidth={2}
                    dot={{ r: 3, fill: emerald, strokeWidth: 0 }}
                    activeDot={{ r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* ── Top contributors ── */}
      {hasContribs && (
        <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-800">
          <p className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-3">
            Top contributors <span className="font-normal text-slate-400 dark:text-slate-500">(last 30 days)</span>
          </p>
          <div className="flex flex-wrap gap-3">
            {topContributors.map((c, i) => (
              <div
                key={i}
                className="flex items-center gap-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md px-3 py-1.5"
              >
                <div className="w-6 h-6 rounded-full bg-indigo-600 flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0">
                  {c.login?.[0]?.toUpperCase() ?? '?'}
                </div>
                <span className="text-sm text-slate-700 dark:text-slate-300 font-medium">
                  {c.login}
                </span>
                <span className="text-xs text-slate-400 dark:text-slate-500">
                  {c.commits} commit{c.commits !== 1 ? 's' : ''}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
