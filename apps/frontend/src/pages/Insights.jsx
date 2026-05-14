import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useConnectedRepos } from '../hooks/useConnectedRepos.js';
import { useInsights } from '../hooks/useInsights.js';

import DashboardHeader from '../components/dashboard/DashboardHeader.jsx';
import RepoSelector from '../components/dashboard/RepoSelector.jsx';
import Skeleton from '../components/Skeleton.jsx';
import TransitionStats from '../components/insights/TransitionStats.jsx';
import ActivityCharts from '../components/insights/ActivityCharts.jsx';
import WorkloadSection from '../components/insights/WorkloadSection.jsx';

export default function Insights({ user, onLogout }) {
  const { repos, loading: reposLoading } = useConnectedRepos();
  const [selectedRepoId, setSelectedRepoId] = useState(null);
  const navigate = useNavigate();

  // Auto-select first repo
  useEffect(() => {
    if (!selectedRepoId && repos.length > 0) {
      setSelectedRepoId(repos[0].id);
    }
  }, [repos, selectedRepoId]);

  const { data, loading, error } = useInsights(selectedRepoId);
  const selectedRepo = repos.find((r) => r.id === selectedRepoId);

  return (
    <div className="max-w-5xl mx-auto px-5 py-6">
      <DashboardHeader user={user} onLogout={onLogout} />

      {/* Title row */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-medium text-slate-900 dark:text-slate-50">
          Project insights
        </h1>
        <button
          onClick={() => navigate('/dashboard')}
          className="text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-50 transition-colors cursor-pointer"
        >
          ← Back to dashboard
        </button>
      </div>

      <RepoSelector
        repos={repos}
        selectedRepoId={selectedRepoId}
        onSelect={setSelectedRepoId}
        onManage={() => navigate('/dashboard')}
      />

      {!selectedRepo ? (
        <div className="py-16 text-center">
          <p className="text-sm text-slate-500 dark:text-slate-400 italic">
            {reposLoading ? 'Loading…' : 'Connect a repo to see insights.'}
          </p>
        </div>
      ) : loading ? (
        <div className="space-y-4 mt-6">
          <Skeleton className="h-44 w-full rounded-lg" />
          <Skeleton className="h-64 w-full rounded-lg" />
          <Skeleton className="h-72 w-full rounded-lg" />
        </div>
      ) : error ? (
        <div className="mt-12 text-center">
          <p className="text-sm text-red-600 dark:text-red-400">
            Failed to load insights: {error}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="mt-3 text-xs text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 underline cursor-pointer"
          >
            Retry
          </button>
        </div>
      ) : data ? (
        <div className="space-y-4 mt-6">
          <TransitionStats stats={data.transitionStats} />
          <ActivityCharts
            commitsByDay={data.commitsByDay}
            tasksCompletedByWeek={data.tasksCompletedByWeek}
            topContributors={data.topContributors}
          />
          <WorkloadSection
            tasksPerAssignee={data.tasksPerAssignee}
            averageTimeInProgress={data.averageTimeInProgress}
            stuckTasks={data.stuckTasks}
          />
        </div>
      ) : null}
    </div>
  );
}
