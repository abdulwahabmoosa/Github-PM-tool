import UnclaimedCallout from './UnclaimedCallout.jsx';
import TaskSection from './TaskSection.jsx';
import AssigneeGroup from './AssigneeGroup.jsx';

export default function TeamTasksSection({ tasks, onTaskClick }) {
  if (tasks.length === 0) {
    return (
      <div className="mb-8">
        <h3 className="text-base font-medium text-slate-900 dark:text-slate-50 mb-4">
          Team tasks · 0
        </h3>
        <div className="py-8 text-center">
          <p className="text-sm text-slate-400 dark:text-slate-500 mb-1">✦</p>
          <p className="text-sm text-slate-500 dark:text-slate-400 italic">
            No team activity yet. Tasks created by others will appear here.
          </p>
        </div>
      </div>
    );
  }

  const unclaimed = tasks.filter((t) => t.status === 'OPEN' && !t.assignee);
  const assignedTasks = tasks.filter((t) => !(t.status === 'OPEN' && !t.assignee));

  const groups = new Map();
  for (const task of assignedTasks) {
    const key = task.assignee ?? 'No assignee';
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(task);
  }
  const sortedGroups = [...groups.entries()].sort((a, b) => b[1].length - a[1].length);

  return (
    <div className="mb-8">
      <h3 className="text-base font-medium text-slate-900 dark:text-slate-50 mb-4">
        Team tasks · {tasks.length}
      </h3>
      <UnclaimedCallout count={unclaimed.length} />
      {unclaimed.length > 0 && (
        <TaskSection
          title="Unclaimed"
          accentColor="text-amber-700 dark:text-amber-400"
          tasks={unclaimed}
          onTaskClick={onTaskClick}
        />
      )}
      {sortedGroups.map(([login, groupTasks]) => (
        <AssigneeGroup key={login} login={login} tasks={groupTasks} onTaskClick={onTaskClick} />
      ))}
    </div>
  );
}
