const STATUS_COLORS = {
  OPEN:        '#888780',
  TO_DO:       '#534AB7',
  IN_PROGRESS: '#BA7517',
  IN_REVIEW:   '#185FA5',
  DONE:        '#639922',
};

export default function TaskCard({ task, onClick }) {
  const color = STATUS_COLORS[task.status] ?? '#888780';
  const isDone = task.status === 'DONE';

  const metaParts = [task.assignee ?? 'unassigned'];
  if (task.branch) metaParts.push(`· ${task.branch}`);
  if (task.linkedIssueNumber) metaParts.push(`· #${task.linkedIssueNumber}`);

  return (
    <div
      onClick={onClick}
      onMouseEnter={(e) => { e.currentTarget.style.background = '#f0f0f0'; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = '#f8f8f8'; }}
      style={{
        display: 'flex',
        flexDirection: 'column',
        borderLeft: `4px solid ${color}`,
        background: '#f8f8f8',
        padding: '10px 14px',
        borderRadius: '0 6px 6px 0',
        cursor: 'pointer',
        marginBottom: 6,
        opacity: isDone ? 0.7 : 1,
      }}
    >
      <p style={{ fontSize: '14px', fontWeight: 500, margin: 0, color: '#111' }}>{task.title}</p>
      <p style={{ fontSize: '12px', color: '#666', margin: '4px 0 0' }}>
        {metaParts.join(' ')}
        {task.needsHelp && <span style={{ color: '#BA7517' }}> · 🙋 needs help</span>}
      </p>
    </div>
  );
}
