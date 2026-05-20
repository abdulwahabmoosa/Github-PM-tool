import AssigneeGroup from './AssigneeGroup.jsx';
import TaskCard from '../TaskCard.jsx';

export default function TeamTasksSection({ tasks, onTaskClick }) {
  const unclaimed = tasks.filter((t) => !t.assignee);
  const assigned  = tasks.filter((t) => t.assignee);

  // Group assigned tasks by assignee login
  const byAssignee = assigned.reduce((acc, t) => {
    if (!acc[t.assignee]) acc[t.assignee] = [];
    acc[t.assignee].push(t);
    return acc;
  }, {});

  // Sort by most recent activity across each assignee's tasks
  const sortedAssignees = Object.keys(byAssignee).sort((a, b) => {
    const latest = (group) =>
      Math.max(...group.map((t) => new Date(t.updatedAt ?? t.createdAt ?? 0).getTime()));
    return latest(byAssignee[b]) - latest(byAssignee[a]);
  });

  if (unclaimed.length === 0 && sortedAssignees.length === 0) {
    return (
      <section className="mb-8">
        <div className="flex items-baseline gap-2 mb-3">
          <h2 className="text-base font-medium text-slate-900 dark:text-slate-50">Team tasks</h2>
        </div>
        <div className="py-8 text-center">
          <p className="text-sm text-slate-400 dark:text-slate-500 mb-1">✦</p>
          <p className="text-sm text-slate-500 dark:text-slate-400 italic">
            No team activity yet. Tasks created by others will appear here.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="mb-8">
      <div className="flex items-baseline gap-2 mb-3">
        <h2 className="text-base font-medium text-slate-900 dark:text-slate-50">Team tasks</h2>
        {sortedAssignees.length > 0 && (
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {sortedAssignees.length} member{sortedAssignees.length === 1 ? '' : 's'}
          </span>
        )}
      </div>

      {/* Unclaimed tasks — flat list, no accordion (no owner) */}
      {unclaimed.length > 0 && (
        <div className="mb-4">
          <p className="text-[10px] font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
            Unclaimed · {unclaimed.length}
          </p>
          <div className="space-y-2">
            {unclaimed.map((task) => (
              <TaskCard key={task.id} task={task} onClick={() => onTaskClick(task)} />
            ))}
          </div>
        </div>
      )}

      {/* Assigned tasks — accordion per member */}
      {sortedAssignees.length > 0 && (
        <div className="space-y-2">
          {sortedAssignees.map((assignee) => (
            <AssigneeGroup
              key={assignee}
              assignee={assignee}
              tasks={byAssignee[assignee]}
              onTaskClick={onTaskClick}
            />
          ))}
        </div>
      )}
    </section>
  );
}
