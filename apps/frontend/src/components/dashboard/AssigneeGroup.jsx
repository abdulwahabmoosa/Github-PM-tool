import { useState } from 'react';
import TaskCard from '../TaskCard.jsx';

const STATUS_LABELS = {
  OPEN: 'open',
  TO_DO: 'todo',
  IN_PROGRESS: 'in progress',
  IN_REVIEW: 'review',
  DONE: 'done',
};

function buildSummary(tasks) {
  const counts = {};
  for (const t of tasks) {
    counts[t.status] = (counts[t.status] ?? 0) + 1;
  }
  const order = ['IN_PROGRESS', 'IN_REVIEW', 'OPEN', 'TO_DO', 'DONE'];
  const parts = [];
  for (const status of order) {
    if (counts[status]) {
      parts.push(`${counts[status]} ${STATUS_LABELS[status] ?? status.toLowerCase()}`);
    }
  }
  return parts.join(' · ');
}

export default function AssigneeGroup({ assignee, tasks, onTaskClick }) {
  const [expanded, setExpanded] = useState(false);

  const summary = buildSummary(tasks);

  return (
    <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center gap-3 p-3 hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors text-left"
      >
        <span className={`text-slate-400 dark:text-slate-500 text-xs leading-none transition-transform duration-150 ${expanded ? 'rotate-90' : ''}`}>
          ▶
        </span>

        <div className="w-6 h-6 rounded-full bg-slate-500 flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0">
          {assignee?.[0]?.toUpperCase() ?? '?'}
        </div>

        <span className="font-medium text-sm text-slate-900 dark:text-slate-50 flex-shrink-0">
          @{assignee}
        </span>

        <span className="text-xs text-slate-500 dark:text-slate-400 truncate">
          {summary}
        </span>

        <span className="ml-auto text-[10px] text-slate-400 dark:text-slate-500 flex-shrink-0">
          {tasks.length} task{tasks.length === 1 ? '' : 's'}
        </span>
      </button>

      {expanded && (
        <div className="px-3 pb-3 pt-1 space-y-2 bg-white/50 dark:bg-slate-950/30">
          {tasks.map((task) => (
            <TaskCard key={task.id} task={task} onClick={() => onTaskClick(task)} />
          ))}
        </div>
      )}
    </div>
  );
}
