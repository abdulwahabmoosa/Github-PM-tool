export default function ConnectedRepos({ repos, onDisconnect, loading }) {
  const s = {
    row: { display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0', borderBottom: '1px solid #eee' },
    tag: { fontSize: '11px', background: '#f0f0f0', padding: '2px 6px', borderRadius: 4 },
    meta: { fontSize: '12px', color: '#666' },
    btn: { marginLeft: 'auto', padding: '4px 10px', cursor: 'pointer', fontSize: '12px' },
    empty: { color: '#666', fontStyle: 'italic' },
  };

  function handleDisconnect(repo) {
    if (window.confirm(`Disconnect ${repo.fullName}? Tasks linked to this repo will be deleted.`)) {
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
          <span style={s.tag}>{repo.private ? 'private' : 'public'}</span>
          <span style={s.meta}>default: {repo.defaultBranch}</span>
          <button style={s.btn} onClick={() => handleDisconnect(repo)}>Disconnect</button>
        </div>
      ))}
    </section>
  );
}
