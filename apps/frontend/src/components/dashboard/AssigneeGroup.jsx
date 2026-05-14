import TaskCard from '../TaskCard.jsx';

const STATUS_PRIORITY = ['IN_PROGRESS', 'HELP_NEEDED', 'IN_REVIEW', 'TO_DO', 'OPEN', 'DONE'];

function sortByStatus(tasks) {
  return [...tasks].sort((a, b) => {
    const ai = STATUS_PRIORITY.indexOf(a.status);
    const bi = STATUS_PRIORITY.indexOf(b.status);
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
  });
}

export default function AssigneeGroup({ login, tasks, onTaskClick }) {
  const sorted = sortByStatus(tasks);

  return (
    <div className="mb-4">
      <p className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
        {login}&apos;s tasks · {tasks.length}
      </p>
      <div className="space-y-1">
        {sorted.map((task) => (
          <TaskCard key={task.id} task={task} onClick={() => onTaskClick(task)} />
        ))}
      </div>
    </div>
  );
}
