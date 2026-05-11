import TaskCard from './TaskCard.jsx';

const SECTIONS = [
  { status: 'OPEN',        label: 'Open' },
  { status: 'TO_DO',       label: 'To do' },
  { status: 'IN_PROGRESS', label: 'In progress' },
  { status: 'HELP_NEEDED', label: 'Help needed' },
  { status: 'IN_REVIEW',   label: 'In review' },
  { status: 'DONE',        label: 'Done' },
];

const headingStyle = {
  fontSize: '12px',
  fontWeight: 500,
  color: '#666',
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
  margin: '16px 0 8px',
};

export default function TaskList({ tasks, onTaskClick, loading }) {
  if (loading) return <p>Loading tasks...</p>;

  if (tasks.length === 0) {
    return (
      <p style={{ color: '#666', fontStyle: 'italic' }}>
        No tasks yet. Click 'New task' to create your first one.
      </p>
    );
  }

  return (
    <div>
      {SECTIONS.map(({ status, label }) => {
        const sectionTasks = tasks.filter((t) => t.status === status);
        return (
          <div key={status}>
            <p style={headingStyle}>{label} · {sectionTasks.length}</p>
            {sectionTasks.length === 0
              ? <p style={{ fontSize: '12px', color: '#aaa', fontStyle: 'italic', margin: '0 0 4px' }}>No tasks</p>
              : sectionTasks.map((task) => (
                  <TaskCard key={task.id} task={task} onClick={() => onTaskClick(task)} />
                ))
            }
          </div>
        );
      })}
    </div>
  );
}
