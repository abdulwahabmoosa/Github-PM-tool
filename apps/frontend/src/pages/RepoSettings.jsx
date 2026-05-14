import { useNavigate, useParams } from 'react-router-dom';
import { useConnectedRepos } from '../hooks/useConnectedRepos.js';
import { useRules } from '../hooks/useRules.js';
import { useToast } from '../hooks/useToast.js';

import DashboardHeader from '../components/dashboard/DashboardHeader.jsx';
import Skeleton from '../components/Skeleton.jsx';
import Toast from '../components/Toast.jsx';

const RULE_META = {
  claim: {
    label: 'Claim',
    description: 'Push task-N-claim to take an unassigned task.',
  },
  help: {
    label: 'Request help',
    description: 'Push task-N-help to mark a claimed task as needing help.',
  },
  helping: {
    label: 'Offer help',
    description: 'Push task-N-helping to take over a task needing help.',
  },
  review: {
    label: 'Mark for review',
    description: 'Push task-N-review to mark a task ready for review.',
  },
  done: {
    label: 'Mark complete',
    description: 'Push task-N-done to mark a task complete.',
  },
};

export default function RepoSettings({ user, onLogout }) {
  const { repoId } = useParams();
  const navigate = useNavigate();
  const { repos, loading: reposLoading } = useConnectedRepos();
  const { rules, loading: rulesLoading, toggleRule } = useRules(repoId);
  const { toast, showToast, hideToast } = useToast();

  const repo = repos.find((r) => r.id === repoId);

  async function handleToggle(ruleType, currentEnabled) {
    try {
      await toggleRule(ruleType, !currentEnabled);
      showToast(
        `"${RULE_META[ruleType]?.label ?? ruleType}" rule ${!currentEnabled ? 'enabled' : 'disabled'}.`,
        'success'
      );
    } catch (err) {
      showToast(`Failed to update rule: ${err.message}`, 'error');
    }
  }

  if (reposLoading || rulesLoading) {
    return (
      <div className="max-w-3xl mx-auto px-5 py-6">
        <div className="space-y-3 mt-8">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-md" />
          ))}
        </div>
      </div>
    );
  }

  if (!repo) {
    return (
      <div className="max-w-3xl mx-auto px-5 py-6">
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">Repo not found.</p>
        <button
          onClick={() => navigate('/dashboard')}
          className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
        >
          ← Back to dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-5 py-6">
      <DashboardHeader user={user} onLogout={onLogout} />

      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-xl font-medium text-slate-900 dark:text-slate-50">
            Settings
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            {repo.fullName}
          </p>
        </div>
        <button
          onClick={() => navigate('/dashboard')}
          className="text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-50 transition-colors cursor-pointer"
        >
          ← Back to dashboard
        </button>
      </div>

      <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5">
        <h2 className="text-sm font-medium text-slate-900 dark:text-slate-50 mb-1">
          Tag-driven rules
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-5">
          Control which automated transitions are active for this repo.
          Disabled rules are still logged but never applied.
        </p>

        <div className="space-y-2">
          {rules.map((rule) => {
            const meta = RULE_META[rule.ruleType] ?? { label: rule.ruleType, description: '' };
            return (
              <div
                key={rule.id}
                className="flex items-center gap-4 p-3 bg-white dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-md"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 dark:text-slate-50 flex items-center gap-2 flex-wrap">
                    {meta.label}
                    <code className="font-mono text-xs bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-slate-600 dark:text-slate-400">
                      task-N-{rule.ruleType}
                    </code>
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {meta.description}
                  </p>
                </div>
                <button
                  onClick={() => handleToggle(rule.ruleType, rule.enabled)}
                  aria-label={`Toggle ${meta.label} rule`}
                  className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors cursor-pointer ${
                    rule.enabled
                      ? 'bg-indigo-600'
                      : 'bg-slate-300 dark:bg-slate-700'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      rule.enabled ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            );
          })}
        </div>
      </div>

      <Toast message={toast.message} variant={toast.variant} onClose={hideToast} />
    </div>
  );
}
