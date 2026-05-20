import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../lib/api.js';
import { useConnectedRepos } from '../hooks/useConnectedRepos.js';
import { useRules } from '../hooks/useRules.js';
import { useMembers } from '../hooks/useMembers.js';
import { useRepoPermissions } from '../hooks/useRepoPermissions.js';
import { useToast } from '../hooks/useToast.js';
import { useDocumentTitle } from '../hooks/useDocumentTitle.js';
import { formatApiError } from '../lib/apiError.js';

import DashboardHeader from '../components/dashboard/DashboardHeader.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import Skeleton from '../components/Skeleton.jsx';
import Toast from '../components/Toast.jsx';

const RULE_META = {
  claim:   { label: 'Claim',           description: 'Push task-N-claim to take an unassigned task.' },
  help:    { label: 'Request help',    description: 'Push task-N-help to mark a claimed task as needing help.' },
  helping: { label: 'Offer help',      description: 'Push task-N-helping to take over a task needing help.' },
  review:  { label: 'Mark for review', description: 'Push task-N-review to mark a task ready for review.' },
  done:    { label: 'Mark complete',   description: 'Push task-N-done to mark a task complete.' },
};

const CARD = 'bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5 mb-5';

function Toggle({ on, onChange, disabled }) {
  return (
    <button
      onClick={() => !disabled && onChange(!on)}
      disabled={disabled}
      className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
        on ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-700'
      }`}
    >
      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${on ? 'translate-x-6' : 'translate-x-1'}`} />
    </button>
  );
}

function RoleBadge({ role, isOwner }) {
  if (isOwner) return <span className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-400">Owner</span>;
  if (role === 'ADMIN') return <span className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400">Admin</span>;
  return <span className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">Member</span>;
}

export default function RepoSettings({ user, onLogout }) {
  const { repoId } = useParams();
  const navigate = useNavigate();
  const { repos, loading: reposLoading, refresh: refreshRepos } = useConnectedRepos();
  const { rules, loading: rulesLoading, toggleRule } = useRules(repoId);
  const { active, available, ownerNotInGitHub, removedCount, loading: membersLoading, updateRole, removeMember, addMember, syncWithGitHub } = useMembers(repoId);
  const [syncing, setSyncing] = useState(false);
  const { toast, showToast, hideToast } = useToast();
  const [confirmState, setConfirmState] = useState(null);

  const repo = repos.find((r) => r.id === repoId);
  const permissions = useRepoPermissions(repo, repo?.myAccess, user);

  useDocumentTitle(repo?.fullName ? `Settings · ${repo.fullName}` : 'Settings');

  // ── Mode toggle ────────────────────────────────────────────────────────────

  async function handleModeChange(newMode) {
    try {
      await api.patch(`/api/repos/${repoId}/mode`, { mode: newMode });
      refreshRepos();
      showToast(`Mode switched to ${newMode}.`, 'success');
    } catch (err) {
      showToast(err.status === 403 ? "Only the repo owner can change mode." : formatApiError(err), 'error');
    }
  }

  // ── Member actions ─────────────────────────────────────────────────────────

  async function handleRoleChange(userId, newRole) {
    try {
      await updateRole(userId, newRole);
      showToast(`Role updated to ${newRole}.`, 'success');
    } catch (err) {
      const msg = err.status === 400 ? 'Cannot demote the last admin. Promote someone else first.' : formatApiError(err);
      showToast(msg, 'error');
    }
  }

  function handleRemoveMember(userId, login) {
    setConfirmState({
      title: `Remove @${login}?`,
      body: 'They will lose access to this repo.',
      confirmLabel: 'Remove',
      confirmVariant: 'danger',
      onConfirm: async () => {
        try {
          await removeMember(userId);
          showToast(`@${login} removed.`, 'success');
        } catch (err) {
          showToast(formatApiError(err), 'error');
        }
      },
    });
  }

  async function handleSyncWithGitHub() {
    if (syncing) return;
    setSyncing(true);
    try {
      const result = await syncWithGitHub();
      if (result) {
        showToast(`Synced — ${result.active.length} active, ${result.available.length} available`, 'success');
      }
    } catch (err) {
      showToast(formatApiError(err), 'error');
    } finally {
      setSyncing(false);
    }
  }

  async function handleAddMember(githubLogin) {
    try {
      await addMember(githubLogin);
      showToast(`@${githubLogin} added.`, 'success');
    } catch (err) {
      showToast(formatApiError(err), 'error');
    }
  }

  // ── Rule toggle ────────────────────────────────────────────────────────────

  async function handleRuleToggle(ruleType, currentEnabled) {
    try {
      await toggleRule(ruleType, !currentEnabled);
      showToast(`"${RULE_META[ruleType]?.label ?? ruleType}" rule ${!currentEnabled ? 'enabled' : 'disabled'}.`, 'success');
    } catch (err) {
      showToast(formatApiError(err), 'error');
    }
  }

  // ── Loading / not found ────────────────────────────────────────────────────

  if (reposLoading) {
    return (
      <div className="max-w-3xl mx-auto px-5 py-6">
        <div className="space-y-3 mt-8">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-lg" />)}</div>
      </div>
    );
  }

  if (!repo) {
    return (
      <div className="max-w-3xl mx-auto px-5 py-6">
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">Repo not found.</p>
        <button onClick={() => navigate('/dashboard')} className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer">← Back to dashboard</button>
      </div>
    );
  }

  const isOpenMode = repo.mode === 'OPEN';

  return (
    <div className="max-w-3xl mx-auto px-5 py-6">
      <DashboardHeader user={user} onLogout={onLogout} />

      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-xl font-medium text-slate-900 dark:text-slate-50">Settings</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{repo.fullName}</p>
        </div>
        <button
          onClick={() => navigate(`/dashboard?repo=${repoId}`)}
          className="text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-50 transition-colors cursor-pointer"
        >
          ← Back to dashboard
        </button>
      </div>

      {/* ── General ─────────────────────────────────────────────────────── */}
      <div className={CARD}>
        <h2 className="text-sm font-medium text-slate-900 dark:text-slate-50 mb-4">General</h2>

        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <p className="text-sm font-medium text-slate-900 dark:text-slate-50 mb-0.5">Repo mode</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              <strong>OPEN:</strong> everyone can manage tasks.{' '}
              <strong>ADMIN:</strong> admins manage, members can only claim and act on their own tasks.
            </p>
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            <span className={`text-xs font-medium ${isOpenMode ? 'text-slate-900 dark:text-slate-50' : 'text-slate-400 dark:text-slate-500'}`}>
              OPEN
            </span>
            <Toggle
              on={!isOpenMode}
              onChange={(toAdmin) => handleModeChange(toAdmin ? 'ADMIN' : 'OPEN')}
              disabled={!permissions.canSwitchMode}
            />
            <span className={`text-xs font-medium ${!isOpenMode ? 'text-slate-900 dark:text-slate-50' : 'text-slate-400 dark:text-slate-500'}`}>
              ADMIN
            </span>
          </div>
        </div>

        {!permissions.canSwitchMode && (
          <p className="mt-3 text-xs text-slate-400 dark:text-slate-500 italic">
            Only the repo owner can change mode.
          </p>
        )}
      </div>

      {/* ── Members ─────────────────────────────────────────────────────── */}
      <div className={CARD}>
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-sm font-medium text-slate-900 dark:text-slate-50">Members</h2>
          <button
            onClick={handleSyncWithGitHub}
            disabled={syncing}
            className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center gap-1.5"
          >
            {syncing ? (
              <>
                <span className="inline-block w-3 h-3 border-2 border-indigo-600 dark:border-indigo-400 border-t-transparent rounded-full animate-spin" />
                Syncing...
              </>
            ) : (
              <>↻ Sync with GitHub</>
            )}
          </button>
        </div>

        {ownerNotInGitHub && (
          <p className="text-xs bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-400 rounded px-3 py-2 mb-3">
            ⚠ You are no longer a collaborator on this repository on GitHub. Polling may fail. Re-add yourself as a collaborator on GitHub, or disconnect this repository.
          </p>
        )}

        {removedCount > 0 && (
          <p className="text-xs bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 text-amber-700 dark:text-amber-400 rounded px-3 py-2 mb-3">
            Removed {removedCount} member{removedCount === 1 ? '' : 's'} no longer in GitHub.
          </p>
        )}

        {isOpenMode && (
          <p className="text-xs bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded px-3 py-2 mb-3">
            Mode is currently <strong>OPEN</strong> — role badges are informational only.
            Switch to ADMIN mode to enforce them.
          </p>
        )}

        {/* ── Active members ── */}
        <p className="text-[10px] font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2 mt-1">
          Active ({active.length})
        </p>
        {membersLoading ? (
          <div className="space-y-2 mb-4">{[...Array(2)].map((_, i) => <Skeleton key={i} className="h-12 w-full rounded-md" />)}</div>
        ) : (
          <div className="space-y-2 mb-4">
            {active.map((m) => (
              <div key={m.userId} className="flex items-center gap-3 p-3 bg-white dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-md">
                {m.avatarUrl ? (
                  <img src={m.avatarUrl} alt={m.githubLogin} className="w-7 h-7 rounded-full flex-shrink-0" />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-indigo-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                    {m.githubLogin?.[0]?.toUpperCase() ?? '?'}
                  </div>
                )}
                <span className="flex-1 text-sm font-medium text-slate-900 dark:text-slate-50 truncate">
                  @{m.githubLogin}
                </span>
                <RoleBadge role={m.role} isOwner={m.isOwner} />
                {permissions.canManageMembers && !m.isOwner && (
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {m.role === 'MEMBER' ? (
                      <button
                        onClick={() => handleRoleChange(m.userId, 'ADMIN')}
                        className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                      >
                        Promote
                      </button>
                    ) : (
                      <button
                        onClick={() => handleRoleChange(m.userId, 'MEMBER')}
                        className="text-xs text-amber-600 dark:text-amber-400 hover:underline cursor-pointer"
                      >
                        Demote
                      </button>
                    )}
                    <span className="text-slate-300 dark:text-slate-700">·</span>
                    <button
                      onClick={() => handleRemoveMember(m.userId, m.githubLogin)}
                      className="text-xs text-red-600 dark:text-red-400 hover:underline cursor-pointer"
                    >
                      Remove
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* ── Available to add ── */}
        {permissions.canManageMembers && !membersLoading && (
          available.length > 0 ? (
            <>
              <p className="text-[10px] font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2 mt-2">
                Available to add ({available.length})
              </p>
              <div className="space-y-2">
                {available.map((u) => (
                  <div key={u.userId} className="flex items-center gap-3 p-3 bg-white dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-md">
                    {u.avatarUrl ? (
                      <img src={u.avatarUrl} alt={u.githubLogin} className="w-7 h-7 rounded-full flex-shrink-0" />
                    ) : (
                      <div className="w-7 h-7 rounded-full bg-slate-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                        {u.githubLogin?.[0]?.toUpperCase() ?? '?'}
                      </div>
                    )}
                    <span className="flex-1 text-sm font-medium text-slate-900 dark:text-slate-50 truncate">
                      @{u.githubLogin}
                    </span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 italic flex-shrink-0">
                      GitHub collaborator
                    </span>
                    <button
                      onClick={() => handleAddMember(u.githubLogin)}
                      className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer flex-shrink-0"
                    >
                      Add
                    </button>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="text-xs text-slate-400 dark:text-slate-500 italic mt-2">
              All GitHub collaborators are already members.
            </p>
          )
        )}
      </div>

      {/* ── Rules ───────────────────────────────────────────────────────── */}
      {permissions.canConfigureRules && (
        <div className={CARD}>
          <h2 className="text-sm font-medium text-slate-900 dark:text-slate-50 mb-1">Tag-driven rules</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
            Disabled rules are still logged but never applied.
          </p>

          {rulesLoading ? (
            <div className="space-y-2">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-14 w-full rounded-md" />)}</div>
          ) : (
            <div className="space-y-2">
              {rules.map((rule) => {
                const meta = RULE_META[rule.ruleType] ?? { label: rule.ruleType, description: '' };
                return (
                  <div key={rule.id} className="flex items-center gap-4 p-3 bg-white dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-md">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 dark:text-slate-50 flex items-center gap-2 flex-wrap">
                        {meta.label}
                        <code className="font-mono text-xs bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-slate-600 dark:text-slate-400">
                          task-N-{rule.ruleType}
                        </code>
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{meta.description}</p>
                    </div>
                    <Toggle
                      on={rule.enabled}
                      onChange={() => handleRuleToggle(rule.ruleType, rule.enabled)}
                    />
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      <ConfirmDialog state={confirmState} onClose={() => setConfirmState(null)} />
      <Toast message={toast.message} variant={toast.variant} onClose={hideToast} />
    </div>
  );
}
