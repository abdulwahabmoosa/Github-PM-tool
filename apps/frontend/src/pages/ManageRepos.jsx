import ConnectedRepos from '../components/ConnectedRepos.jsx';
import RepoBrowser from '../components/RepoBrowser.jsx';
import { useDocumentTitle } from '../hooks/useDocumentTitle.js';

export default function ManageRepos({
  connectedRepos, connectedLoading,
  githubRepos, githubLoading, githubError,
  connectedGithubIds,
  onConnect, onDisconnect, onRefreshGithub,
  onBack,
}) {
  useDocumentTitle('Manage repos');
  return (
    <div className="max-w-3xl mx-auto px-5 py-6">
      <button
        onClick={onBack}
        className="text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 mb-6 block transition-colors"
      >
        ← Back to dashboard
      </button>

      <ConnectedRepos repos={connectedRepos} onDisconnect={onDisconnect} loading={connectedLoading} />

      <div className="border-t border-slate-200 dark:border-slate-800 pt-6">
        <RepoBrowser
          githubRepos={githubRepos}
          connectedGithubIds={connectedGithubIds}
          onConnect={onConnect}
          loading={githubLoading}
          error={githubError}
          onRefresh={onRefreshGithub}
        />
      </div>
    </div>
  );
}
