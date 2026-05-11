export default function ConnectedRepos({ repos, onDisconnect, loading }) {
  const s = {
    row: { display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0', borderBottom: '1px solid #eee' },
    tag: { fontSize: '11px', background: '#f0f0f0', padding: '2px 6px', borderRadius: 4 },
    meta: { fontSize: '12px', color: '#666' },
    btn: { marginLeft: 'auto', padding: '4px 10px', cursor: 'pointer', fontSize: '12px' },
    empty: { color: '#666', fontStyle: 'italic' },
  };

  function roleBadge(role) {
    return (
      <span style={{
        fontSize: '10px',
        padding: '2px 6px',
        borderRadius: 4,
        background: role === 'owner' ? '#185FA5' : '#e0e0e0',
        color: role === 'owner' ? '#fff' : '#333',
        textTransform: 'uppercase',
        letterSpacing: '0.04em',
        flexShrink: 0,
      }}>
        {role}
      </span>
    );
  }

  function disconnectMessage(repo) {
    if (repo.role === 'member') {
      return `Remove your access to ${repo.fullName}? Other team members keep access.`;
    }
    return `Disconnect ${repo.fullName}?\n\nIf you're the only member, the repo and all tasks will be deleted.\nIf other members exist, ownership transfers to the oldest member.`;
  }

  function handleDisconnect(repo) {
    if (window.confirm(disconnectMessage(repo))) {
      onDisconnect(repo.id);
    }
  }

  return (
    <section style={{ marginBottom: 32 }}>
      <h2 style={{ fontSize: '1.1rem' }}>Connected repositories</h2>
      {loading && <p>Loading...</p>}
      {!loading && repos.length === 0 && (
        <p style={s.empty}>No repositories connected yet. Connect one from the list below.</p>
      )}
      {repos.map((repo) => (
        <div key={repo.id} style={s.row}>
          <span>{repo.fullName}</span>
          {roleBadge(repo.role)}
          <span style={s.tag}>{repo.private ? 'private' : 'public'}</span>
          <span style={s.meta}>default: {repo.defaultBranch}</span>
          <button style={s.btn} onClick={() => handleDisconnect(repo)}>Disconnect</button>
        </div>
      ))}
    </section>
  );
}
