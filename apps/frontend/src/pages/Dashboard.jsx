import { useState, useEffect, useCallback } from 'react';
import { api } from '../lib/api.js';
import { useConnectedRepos } from '../hooks/useConnectedRepos.js';
import { useTasks } from '../hooks/useTasks.js';
import RepoTabs from '../components/RepoTabs.jsx';
import TaskList from '../components/TaskList.jsx';
import TaskFormModal from '../components/TaskFormModal.jsx';
import TaskDetailModal from '../components/TaskDetailModal.jsx';
import ManageRepos from './ManageRepos.jsx';

export default function Dashboard({ user, onLogout }) {
  const { repos: connectedRepos, loading: reposLoading, refresh: refreshRepos } = useConnectedRepos();
  const [selectedRepoId, setSelectedRepoId] = useState(null);
  const [showManageRepos, setShowManageRepos] = useState(false);
  const [taskFormModal, setTaskFormModal] = useState({ open: false, mode: 'create' });
  const [taskDetailModal, setTaskDetailModal] = useState({ open: false, task: null });

  const tasks = useTasks(selectedRepoId);

  const [githubRepos, setGithubRepos] = useState([]);
  const [githubLoading, setGithubLoading] = useState(false);
  const [githubError, setGithubError] = useState(null);

  const fetchGithub = useCallback(() => {
    setGithubLoading(true);
    setGithubError(null);
    api.get('/api/me/github-repos')
      .then((repos) => { setGithubRepos(repos); setGithubLoading(false); })
      .catch((err) => { setGithubError(err.message); setGithubLoading(false); });
  }, []);

  // Auto-select first repo once connected repos load
  useEffect(() => {
    if (reposLoading) return;
    if (connectedRepos.length > 0 && !selectedRepoId) {
      setSelectedRepoId(connectedRepos[0].id);
    }
  }, [reposLoading, connectedRepos]); // eslint-disable-line react-hooks/exhaustive-deps

  // If selected repo was disconnected, fall back to first remaining (or null)
  useEffect(() => {
    if (!selectedRepoId || reposLoading) return;
    if (!connectedRepos.find((r) => r.id === selectedRepoId)) {
      setSelectedRepoId(connectedRepos[0]?.id ?? null);
    }
  }, [connectedRepos]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleConnect(payload) {
    try {
      await api.post('/api/repos/connect', payload);
      refreshRepos();
    } catch (err) {
      alert(`Failed to connect repo: ${err.message}`);
    }
  }

  async function handleDisconnect(repoId) {
    try {
      await api.delete(`/api/repos/${repoId}`);
      if (repoId === selectedRepoId) {
        const remaining = connectedRepos.filter((r) => r.id !== repoId);
        setSelectedRepoId(remaining[0]?.id ?? null);
      }
      refreshRepos();
    } catch (err) {
      alert(`Failed to disconnect repo: ${err.message}`);
    }
  }

  async function handleCreateTask(payload) {
    try {
      await tasks.createTask(payload);
      setTaskFormModal({ open: false, mode: 'create' });
    } catch (err) {
      alert(`Failed to create task: ${err.message}`);
    }
  }

  async function handleDetailSave(id, changed) {
    if (!changed) { setTaskDetailModal({ open: false, task: null }); return; }
    try {
      await tasks.updateTask(id, changed);
      setTaskDetailModal({ open: false, task: null });
    } catch (err) {
      alert(`Failed to save task: ${err.message}`);
    }
  }

  async function handleStatusChange(id, status) {
    try {
      const updated = await tasks.updateStatus(id, status);
      // Keep detail modal open but reflect new status
      setTaskDetailModal((prev) => prev.open && prev.task?.id === id
        ? { ...prev, task: updated }
        : prev
      );
    } catch (err) {
      alert(`Failed to update status: ${err.message}`);
    }
  }

  async function handleDeleteTask(id) {
    try {
      await tasks.deleteTask(id);
      setTaskDetailModal({ open: false, task: null });
    } catch (err) {
      alert(`Failed to delete task: ${err.message}`);
    }
  }

  const connectedGithubIds = new Set(connectedRepos.map((r) => String(r.githubRepoId)));
  const selectedRepo = connectedRepos.find((r) => r.id === selectedRepoId);

  const s = {
    page: { fontFamily: 'system-ui', padding: '32px', maxWidth: '900px' },
    header: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 },
    avatar: { width: 40, height: 40, borderRadius: '50%' },
    logoutBtn: { marginLeft: 'auto', padding: '6px 14px', cursor: 'pointer', fontSize: '13px' },
    repoBar: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '20px 0 12px' },
    newTaskBtn: { padding: '7px 14px', cursor: 'pointer', fontSize: '13px' },
    emptyLink: { cursor: 'pointer', background: 'none', border: 'none', color: '#185FA5', padding: 0, fontSize: 'inherit', textDecoration: 'underline' },
  };

  if (showManageRepos) {
    return (
      <ManageRepos
        connectedRepos={connectedRepos}
        connectedLoading={reposLoading}
        githubRepos={githubRepos}
        githubLoading={githubLoading}
        githubError={githubError}
        connectedGithubIds={connectedGithubIds}
        onConnect={handleConnect}
        onDisconnect={handleDisconnect}
        onRefreshGithub={fetchGithub}
        onBack={() => setShowManageRepos(false)}
      />
    );
  }

  return (
    <div style={s.page}>
      <div style={s.header}>
        {user.avatarUrl && <img src={user.avatarUrl} alt="" style={s.avatar} />}
        <span>Hi, <strong>{user.githubLogin}</strong></span>
        <button style={s.logoutBtn} onClick={onLogout}>Logout</button>
      </div>

      <RepoTabs
        repos={connectedRepos}
        selectedRepoId={selectedRepoId}
        onSelect={setSelectedRepoId}
        onManage={() => { fetchGithub(); setShowManageRepos(true); }}
      />

      {!reposLoading && connectedRepos.length === 0 ? (
        <p style={{ color: '#666', marginTop: 20 }}>
          No repositories connected.{' '}
          <button style={s.emptyLink} onClick={() => { fetchGithub(); setShowManageRepos(true); }}>
            Connect a repository
          </button>{' '}
          to get started.
        </p>
      ) : selectedRepoId ? (
        <>
          <div style={s.repoBar}>
            <h2 style={{ margin: 0, fontSize: '1rem', color: '#333' }}>{selectedRepo?.fullName}</h2>
            <button
              style={s.newTaskBtn}
              onClick={() => setTaskFormModal({ open: true, mode: 'create' })}
            >
              + New task
            </button>
          </div>
          <TaskList tasks={tasks.tasks} loading={tasks.loading} onTaskClick={(task) => setTaskDetailModal({ open: true, task })} />
        </>
      ) : (
        <p style={{ color: '#666', marginTop: 20 }}>Select a repository above or click '+ Manage repos' to connect one.</p>
      )}

      <TaskFormModal
        isOpen={taskFormModal.open && taskFormModal.mode === 'create'}
        onClose={() => setTaskFormModal({ open: false, mode: 'create' })}
        onSubmit={handleCreateTask}
        initialValues={{}}
        repoId={selectedRepoId}
        mode="create"
      />

      <TaskDetailModal
        task={taskDetailModal.task}
        isOpen={taskDetailModal.open}
        onClose={() => setTaskDetailModal({ open: false, task: null })}
        onSave={handleDetailSave}
        onDelete={handleDeleteTask}
        onStatusChange={handleStatusChange}
        repoId={selectedRepoId}
      />
    </div>
  );
}
