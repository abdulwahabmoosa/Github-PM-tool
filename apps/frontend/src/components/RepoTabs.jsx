export default function RepoTabs({ repos, selectedRepoId, onSelect, onManage }) {
  const s = {
    container: { borderBottom: '1px solid #ccc', display: 'flex', flexWrap: 'wrap' },
    tab: (selected) => ({
      padding: '8px 12px',
      cursor: 'pointer',
      border: 'none',
      background: 'none',
      borderBottom: selected ? '3px solid #185FA5' : '3px solid transparent',
      fontFamily: 'system-ui',
      fontSize: '13px',
      fontWeight: selected ? 600 : 400,
      color: selected ? '#185FA5' : '#333',
      maxWidth: 220,
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap',
    }),
    manageBtn: {
      padding: '8px 12px',
      cursor: 'pointer',
      border: 'none',
      background: 'none',
      borderBottom: '3px solid transparent',
      fontFamily: 'system-ui',
      fontSize: '13px',
      color: '#666',
    },
  };

  return (
    <div style={s.container}>
      {repos.map((repo) => (
        <button
          key={repo.id}
          style={s.tab(repo.id === selectedRepoId)}
          onClick={() => onSelect(repo.id)}
          title={repo.fullName}
        >
          {repo.name}
          {repo.role === 'owner' && (
            <span style={{
              fontSize: '9px',
              padding: '1px 4px',
              borderRadius: 3,
              background: '#185FA5',
              color: '#fff',
              marginLeft: 6,
              verticalAlign: 'middle',
            }}>
              OWNER
            </span>
          )}
        </button>
      ))}
      <button style={s.manageBtn} onClick={onManage}>+ Manage repos</button>
    </div>
  );
}
