import { useState, useEffect, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../lib/api.js';
import { useConnectedRepos } from '../hooks/useConnectedRepos.js';
import { useTasks } from '../hooks/useTasks.js';
import { useProjectStats } from '../hooks/useProjectStats.js';
import { useToast } from '../hooks/useToast.js';
import { useRules } from '../hooks/useRules.js';
import { useRepoPermissions } from '../hooks/useRepoPermissions.js';
import { useDocumentTitle } from '../hooks/useDocumentTitle.js';
import { formatApiError } from '../lib/apiError.js';

import DashboardHeader from '../components/dashboard/DashboardHeader.jsx';
import RepoSelector from '../components/dashboard/RepoSelector.jsx';
import RepoToolbar from '../components/dashboard/RepoToolbar.jsx';
import ProjectOverview from '../components/dashboard/ProjectOverview.jsx';
import YourTasksSection from '../components/dashboard/YourTasksSection.jsx';
import TeamTasksSection from '../components/dashboard/TeamTasksSection.jsx';
import HelpNeededSection from '../components/dashboard/HelpNeededSection.jsx';
import UnclaimedCallout from '../components/dashboard/UnclaimedCallout.jsx';

import TaskFormModal from '../components/TaskFormModal.jsx';
import TaskDetailModal from '../components/TaskDetailModal.jsx';
import Skeleton from '../components/Skeleton.jsx';
import Toast from '../components/Toast.jsx';
import ManageRepos from './ManageRepos.jsx';

function TaskCardSkeleton() {
  return (
    <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md border-l-4 border-l-slate-300 dark:border-l-slate-700 p-3">
      <Skeleton className="h-4 w-3/4 mb-2" />
      <Skeleton className="h-3 w-1/2 mb-3" />
      <Skeleton className="h-6 w-full" />
    </div>
  );
}

export default function Dashboard({ user, onLogout }) {
  const { repos: connectedRepos, loading: reposLoading, refresh: refreshRepos } = useConnectedRepos();
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedRepoId = searchParams.get('repo');
  const selectedRepoId = connectedRepos.find((r) => r.id === requestedRepoId)?.id
    ?? connectedRepos[0]?.id
    ?? null;
  const [showManageRepos, setShowManageRepos] = useState(false);
  const [newTaskOpen, setNewTaskOpen] = useState(false);
  const [taskDetailModal, setTaskDetailModal] = useState({ open: false, task: null });
  const [polling, setPolling] = useState(false);
  const [tick, setTick] = useState(0);

  const { toast, showToast, hideToast } = useToast();

  // GitHub repos state — only needed for ManageRepos passthrough
  const [githubRepos, setGithubRepos] = useState([]);
  const [githubLoading, setGithubLoading] = useState(false);
  const [githubError, setGithubError] = useState(null);

  const selectedRepo = connectedRepos.find((r) => r.id === selectedRepoId);

  const tasksHook = useTasks(selectedRepoId);
  const statsHook = useProjectStats(selectedRepoId);
  const { rules } = useRules(selectedRepoId);
  const enabledCount = rules.filter((r) => r.enabled).length;
  const permissions = useRepoPermissions(selectedRepo, selectedRepo?.myAccess, user);

  // Re-render tick every 5s for relative time displays
  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 5000);
    return () => clearInterval(t);
  }, []);

  // Sync ?repo= param: on initial load, or when the stored ID no longer exists
  useEffect(() => {
    if (reposLoading || connectedRepos.length === 0) return;
    if (!connectedRepos.find((r) => r.id === requestedRepoId)) {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.set('repo', connectedRepos[0].id);
          return next;
        },
        { replace: true },
      );
    }
  }, [reposLoading, connectedRepos, requestedRepoId]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchGithub = useCallback(() => {
    setGithubLoading(true);
    setGithubError(null);
    api.get('/api/me/github-repos')
      .then((repos) => { setGithubRepos(repos); setGithubLoading(false); })
      .catch((err) => { setGithubError(err.message); setGithubLoading(false); });
  }, []);

  function handleSelectRepo(repoId) {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.set('repo', repoId);
        return next;
      },
      { replace: true },
    );
  }

  async function handlePollNow() {
    if (!selectedRepoId) return;
    setPolling(true);
    try {
      const result = await api.post(`/api/repos/${selectedRepoId}/poll-now`);
      showToast(`Polled. ${result.newEvents ?? 0} new event(s).`, 'success');
      refreshRepos();
      tasksHook.refresh();
      statsHook.refresh();
    } catch (err) {
      showToast(formatApiError(err), 'error');
    } finally {
      setPolling(false);
    }
  }

  async function handleConnect(payload) {
    try {
      await api.post('/api/repos/connect', payload);
      refreshRepos();
    } catch (err) {
      showToast(formatApiError(err), 'error');
    }
  }

  async function handleDisconnect(repoId) {
    try {
      await api.delete(`/api/repos/${repoId}`);
      if (repoId === selectedRepoId) {
        const fallback = connectedRepos.filter((r) => r.id !== repoId)[0]?.id ?? null;
        setSearchParams(
          (prev) => {
            const next = new URLSearchParams(prev);
            if (fallback) {
              next.set('repo', fallback);
            } else {
              next.delete('repo');
            }
            return next;
          },
          { replace: true },
        );
      }
      refreshRepos();
    } catch (err) {
      showToast(formatApiError(err), 'error');
    }
  }

  async function handleCreateTask(payload) {
    try {
      await tasksHook.createTask(payload);
      setNewTaskOpen(false);
      statsHook.refresh();
    } catch (err) {
      showToast(formatApiError(err), 'error');
    }
  }

  async function handleSaveTask(id, changed) {
    if (!changed) { setTaskDetailModal({ open: false, task: null }); return; }
    try {
      await tasksHook.updateTask(id, changed);
      setTaskDetailModal({ open: false, task: null });
    } catch (err) {
      showToast(formatApiError(err), 'error');
    }
  }

  async function handleStatusChange(id, status) {
    try {
      const updated = await tasksHook.updateStatus(id, status);
      setTaskDetailModal((prev) =>
        prev.open && prev.task?.id === id ? { ...prev, task: updated } : prev
      );
    } catch (err) {
      showToast(formatApiError(err), 'error');
    }
  }

  async function handleDeleteTask(id) {
    try {
      await tasksHook.deleteTask(id);
      setTaskDetailModal({ open: false, task: null });
      statsHook.refresh();
    } catch (err) {
      showToast(formatApiError(err), 'error');
    }
  }

  useDocumentTitle('Dashboard');

  const currentUserLogin = user.githubLogin;
  const yourTasks = tasksHook.tasks.filter(
    (t) => t.assignee && t.assignee.toLowerCase() === currentUserLogin.toLowerCase()
  );
  const helpNeededTasks = tasksHook.tasks.filter(
    (t) => t.status === 'HELP_NEEDED'
  );
  const teamTasksAll = tasksHook.tasks.filter(
    (t) =>
      t.status !== 'HELP_NEEDED' &&
      (!t.assignee || t.assignee.toLowerCase() !== currentUserLogin.toLowerCase())
  );
  const unclaimedCount = teamTasksAll.filter((t) => !t.assignee).length;

  const authFailed = selectedRepo?.syncState?.lastPollStatus === 'AUTH_FAILED';
  const tasksInitialLoading = tasksHook.loading && tasksHook.tasks.length === 0;

  if (showManageRepos) {
    return (
      <>
        <ManageRepos
          connectedRepos={connectedRepos}
          connectedLoading={reposLoading}
          githubRepos={githubRepos}
          githubLoading={githubLoading}
          githubError={githubError}
          connectedGithubIds={new Set(connectedRepos.map((r) => String(r.githubRepoId)))}
          onConnect={handleConnect}
          onDisconnect={handleDisconnect}
          onRefreshGithub={fetchGithub}
          onBack={() => setShowManageRepos(false)}
        />
        <Toast message={toast.message} variant={toast.variant} onClose={hideToast} />
      </>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-5 py-6">
      <DashboardHeader user={user} onLogout={onLogout} />

      <RepoSelector
        repos={connectedRepos}
        selectedRepoId={selectedRepoId}
        onSelect={handleSelectRepo}
        onManage={() => { fetchGithub(); setShowManageRepos(true); }}
      />

      {!selectedRepo ? (
        reposLoading ? (
          <div className="py-12 space-y-3">
            {[...Array(3)].map((_, i) => <TaskCardSkeleton key={i} />)}
          </div>
        ) : (
          /* ── No repo connected: rich empty state ── */
          <div className="py-20 text-center">
            <p className="text-3xl mb-4">📂</p>
            <h3 className="text-base font-medium text-slate-900 dark:text-slate-50 mb-2">
              Connect a repository to get started
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 max-w-sm mx-auto">
              Pick a repo from GitHub. TaskMaster will start polling for tags and
              commits within 30 seconds.
            </p>
            <button
              onClick={() => { fetchGithub(); setShowManageRepos(true); }}
              className="bg-slate-900 dark:bg-slate-50 text-white dark:text-slate-900 hover:bg-slate-700 dark:hover:bg-slate-200 px-4 py-2 text-sm font-medium rounded-md transition-colors cursor-pointer"
            >
              Browse repositories
            </button>
          </div>
        )
      ) : (
        <>
          {/* ── AUTH_FAILED persistent banner ── */}
          {authFailed && (
            <div className="mb-4 flex items-center gap-3 px-4 py-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 text-sm text-amber-900 dark:text-amber-200">
              <span className="flex-1">
                ⚠ Authentication failed for this repo. The GitHub token may have been revoked.
              </span>
              <button
                onClick={() => { fetchGithub(); setShowManageRepos(true); }}
                className="flex-shrink-0 text-xs font-medium underline hover:no-underline cursor-pointer"
              >
                Manage repos
              </button>
            </div>
          )}

          <RepoToolbar
            repo={selectedRepo}
            onPollNow={handlePollNow}
            onNewTask={() => setNewTaskOpen(true)}
            polling={polling}
            tick={tick}
            canCreateTask={permissions.canCreateTask}
          />

          <ProjectOverview stats={statsHook.stats} />

          <div className="flex items-center justify-between mb-2">
            {rules.length > 0 ? (
              <span className="text-xs text-slate-500 dark:text-slate-400">
                {enabledCount} of {rules.length} rules active
                {permissions.canConfigureRules && enabledCount < rules.length && (
                  <Link
                    to={`/repos/${selectedRepoId}/settings`}
                    className="ml-1.5 text-indigo-600 dark:text-indigo-400 hover:underline"
                  >
                    Configure
                  </Link>
                )}
              </span>
            ) : (
              <span />
            )}
            <Link
              to={`/insights${selectedRepoId ? `?repo=${selectedRepoId}` : ''}`}
              className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline"
            >
              View insights →
            </Link>
          </div>

          {tasksInitialLoading ? (
            <div className="space-y-2 mb-8">
              {[...Array(4)].map((_, i) => <TaskCardSkeleton key={i} />)}
            </div>
          ) : tasksHook.tasks.length === 0 ? (
            <div className="py-16 text-center">
              <div className="text-4xl mb-3 opacity-30">✦</div>
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                No tasks yet
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                Create your first task or push a tag like task-1-claim to get started.
              </p>
              {permissions.canCreateTask && (
                <button
                  onClick={() => setNewTaskOpen(true)}
                  className="bg-slate-900 dark:bg-slate-50 text-white dark:text-slate-900 px-3.5 py-2 text-sm font-medium rounded-md hover:bg-slate-700 dark:hover:bg-slate-200 transition-colors"
                >
                  + Create your first task
                </button>
              )}
            </div>
          ) : (
            <>
              <UnclaimedCallout count={unclaimedCount} />
              <YourTasksSection
                tasks={yourTasks}
                onTaskClick={(task) => setTaskDetailModal({ open: true, task })}
                currentUserLogin={currentUserLogin}
              />
              <HelpNeededSection
                tasks={helpNeededTasks}
                onTaskClick={(task) => setTaskDetailModal({ open: true, task })}
              />
              <TeamTasksSection
                tasks={teamTasksAll}
                onTaskClick={(task) => setTaskDetailModal({ open: true, task })}
              />
            </>
          )}
        </>
      )}

      <TaskFormModal
        isOpen={newTaskOpen}
        onClose={() => setNewTaskOpen(false)}
        onSubmit={handleCreateTask}
        initialValues={{}}
        repoId={selectedRepoId}
        mode="create"
      />

      <TaskDetailModal
        task={taskDetailModal.task}
        isOpen={taskDetailModal.open}
        onClose={() => setTaskDetailModal({ open: false, task: null })}
        onSave={handleSaveTask}
        onDelete={handleDeleteTask}
        onStatusChange={handleStatusChange}
        repoId={selectedRepoId}
        permissions={permissions}
      />

      <Toast message={toast.message} variant={toast.variant} onClose={hideToast} />
    </div>
  );
}
