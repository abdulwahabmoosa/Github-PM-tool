import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { useTheme } from '../../hooks/useTheme.js';

const CARD = 'bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-lg p-5';

function isDarkMode(mode) {
  return mode === 'dark' ||
    (mode === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
}

export default function TransitionStats({ stats }) {
  const { mode } = useTheme();
  const dark = isDarkMode(mode);

  const { totalLast30Days = 0, tagDriven = 0, manual = 0, tagDrivenPercent = 0 } = stats ?? {};
  const hasData = totalLast30Days > 0;

  const pieData = [
    { name: 'Tag-driven', value: tagDriven   || (hasData ? 0 : 1) },
    { name: 'Manual',     value: manual       || (hasData ? 0 : 1) },
  ];

  const tooltipStyle = {
    background: dark ? '#1e293b' : '#fff',
    border: `1px solid ${dark ? '#334155' : '#e2e8f0'}`,
    borderRadius: 6,
    fontSize: 12,
    color: dark ? '#f8fafc' : '#0f172a',
  };

  return (
    <div className={CARD}>
      <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-4">
        Tag-driven vs manual transitions · last 30 days
      </p>

      {hasData ? (
        <div className="flex items-center gap-6 flex-wrap">
          {/* Big stat */}
          <div className="flex-1 min-w-[140px]">
            <p className="text-5xl font-medium text-indigo-600 dark:text-indigo-400 leading-none mb-2">
              {tagDrivenPercent}%
            </p>
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-snug">
              of {totalLast30Days} transition{totalLast30Days !== 1 ? 's' : ''} were driven by git tags
            </p>
            <div className="flex gap-4 mt-4 text-xs text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-1.5">
                <span className="inline-block w-2.5 h-2.5 rounded-full bg-indigo-500" />
                Tag-driven: {tagDriven}
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block w-2.5 h-2.5 rounded-full bg-slate-400" />
                Manual: {manual}
              </span>
            </div>
          </div>

          {/* Pie chart */}
          <div className="w-32 h-32 flex-shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%" cy="50%"
                  innerRadius={28} outerRadius={52}
                  dataKey="value"
                  strokeWidth={0}
                >
                  <Cell fill="#6366f1" />
                  <Cell fill={dark ? '#475569' : '#94a3b8'} />
                </Pie>
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(v, name) => [`${v} transitions`, name]}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      ) : (
        <div className="py-8 text-center">
          <p className="text-sm text-slate-400 dark:text-slate-500 italic">
            No status transitions in the last 30 days yet.
          </p>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
            Push a tag like <code className="font-mono bg-slate-100 dark:bg-slate-800 px-1 rounded">task-1-claim</code> to get started.
          </p>
        </div>
      )}
    </div>
  );
}
