export default function RepoBrowser({ githubRepos, connectedGithubIds, onConnect, loading, error, onRefresh }) {
  const s = {
    row: { display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0', borderBottom: '1px solid #eee' },
    tag: { fontSize: '11px', background: '#f0f0f0', padding: '2px 6px', borderRadius: 4 },
    btn: { marginLeft: 'auto', padding: '4px 10px', cursor: 'pointer', fontSize: '12px' },
    connectedBtn: { marginLeft: 'auto', padding: '4px 10px', fontSize: '12px', background: '#e6f4ea', color: '#2d7a3a', border: '1px solid #aed6b5', borderRadius: 4, cursor: 'default' },
    header: { display: 'flex', alignItems: 'center', gap: 12 },
    refreshBtn: { padding: '4px 10px', cursor: 'pointer', fontSize: '12px' },
  };

  return (
    <section>
      <div style={s.header}>
        <h2 style={{ fontSize: '1.1rem', margin: 0 }}>Browse your GitHub repositories</h2>
        <button style={s.refreshBtn} onClick={onRefresh}>Refresh</button>
      </div>
      {loading && <p>Loading...</p>}
      {error && <p style={{ color: 'red' }}>{error}</p>}
      {!loading && !error && githubRepos.map((repo) => {
        const isConnected = connectedGithubIds.has(String(repo.githubRepoId));
        return (
          <div key={repo.githubRepoId} style={s.row}>
            <span>{repo.fullName}</span>
            <span style={s.tag}>{repo.private ? 'private' : 'public'}</span>
            {isConnected
              ? <button style={s.connectedBtn} disabled>✓ Connected</button>
              : <button style={s.btn} onClick={() => onConnect(repo)}>Connect</button>
            }
          </div>
        );
      })}
    </section>
  );
}
