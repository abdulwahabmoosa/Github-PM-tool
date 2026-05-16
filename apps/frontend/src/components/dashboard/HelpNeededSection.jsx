import TaskCard from '../TaskCard.jsx';

export default function HelpNeededSection({ tasks, onTaskClick }) {
  if (!tasks || tasks.length === 0) return null;

  return (
    <section className="mb-8">
      <div className="flex items-baseline gap-2 mb-2">
        <h2 className="text-base font-medium text-slate-900 dark:text-slate-50">
          Help needed
        </h2>
        <span className="text-xs text-slate-500 dark:text-slate-400">
          {tasks.length}
        </span>
      </div>

      <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
        Tasks across the team that need help. Push{' '}
        <code className="font-mono text-xs bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded">
          task-N-helping
        </code>{' '}
        to take over.
      </p>

      <div className="space-y-2">
        {tasks.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            onClick={() => onTaskClick(task)}
          />
        ))}
      </div>
    </section>
  );
}
