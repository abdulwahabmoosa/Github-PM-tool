import { cn } from '../../lib/cn.js';
import TaskCard from '../TaskCard.jsx';

export default function TaskSection({ title, accentColor, tasks, onTaskClick, emptyMessage }) {
  if (tasks.length === 0 && !emptyMessage) return null;

  return (
    <div className="mb-4">
      <p className={cn('text-xs font-medium uppercase tracking-wider mb-2', accentColor ?? 'text-slate-500 dark:text-slate-400')}>
        {title} · {tasks.length}
      </p>
      {tasks.length === 0 ? (
        <p className="text-xs text-slate-400 dark:text-slate-500 italic">{emptyMessage}</p>
      ) : (
        <div className="space-y-1">
          {tasks.map((task) => (
            <TaskCard key={task.id} task={task} onClick={() => onTaskClick(task)} />
          ))}
        </div>
      )}
    </div>
  );
}
