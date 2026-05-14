import TaskSection from './TaskSection.jsx';

const STATUS_ORDER = [
  { status: 'IN_PROGRESS', label: 'In progress', className: 'text-amber-700 dark:text-amber-400' },
  { status: 'HELP_NEEDED', label: 'Help needed', className: 'text-red-700 dark:text-red-400' },
  { status: 'IN_REVIEW',   label: 'In review',   className: 'text-blue-700 dark:text-blue-400' },
  { status: 'TO_DO',       label: 'To do',       className: 'text-indigo-700 dark:text-indigo-400' },
  { status: 'OPEN',        label: 'Open',         className: 'text-slate-600 dark:text-slate-400' },
  { status: 'DONE',        label: 'Done',         className: 'text-emerald-700 dark:text-emerald-400' },
];

export default function YourTasksSection({ tasks, onTaskClick }) {
  return (
    <div className="mb-8">
      <h3 className="text-base font-medium text-slate-900 dark:text-slate-50 mb-4">
        Your tasks · {tasks.length}
      </h3>
      {tasks.length === 0 ? (
        <div className="py-8 text-center">
          <p className="text-sm text-slate-400 dark:text-slate-500 mb-1">✦</p>
          <p className="text-sm text-slate-500 dark:text-slate-400 italic">
            No tasks assigned to you. Browse Team tasks to claim one.
          </p>
        </div>
      ) : (
        STATUS_ORDER.map(({ status, label, className }) => {
          const section = tasks.filter((t) => t.status === status);
          return (
            <TaskSection
              key={status}
              title={label}
              accentColor={className}
              tasks={section}
              onTaskClick={onTaskClick}
            />
          );
        })
      )}
    </div>
  );
}
