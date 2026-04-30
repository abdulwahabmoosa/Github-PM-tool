import ConnectedRepos from '../components/ConnectedRepos.jsx';
import RepoBrowser from '../components/RepoBrowser.jsx';

export default function ManageRepos({
  connectedRepos, connectedLoading,
  githubRepos, githubLoading, githubError,
  connectedGithubIds,
  onConnect, onDisconnect, onRefreshGithub,
  onBack,
}) {
  return (
    <div style={{ fontFamily: 'system-ui', padding: '32px', maxWidth: '800px' }}>
      <button
        onClick={onBack}
        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px', color: '#185FA5', padding: '0 0 20px', display: 'block' }}
      >
        ← Back to dashboard
      </button>
      <ConnectedRepos repos={connectedRepos} onDisconnect={onDisconnect} loading={connectedLoading} />
      <RepoBrowser
        githubRepos={githubRepos}
        connectedGithubIds={connectedGithubIds}
        onConnect={onConnect}
        loading={githubLoading}
        error={githubError}
        onRefresh={onRefreshGithub}
      />
    </div>
  );
}
