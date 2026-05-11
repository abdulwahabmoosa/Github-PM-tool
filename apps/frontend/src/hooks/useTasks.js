import { useEffect, useState, useCallback } from 'react';
import { api } from '../lib/api.js';

export function useTasks(repoId) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const refresh = useCallback(() => {
    if (!repoId) { setTasks([]); return; }
    setLoading(true);
    setError(null);
    api.get(`/api/repos/${repoId}/tasks`)
      .then((data) => { setTasks(data); setLoading(false); })
      .catch((err) => { setError(err.message); setLoading(false); });
  }, [repoId]);

  useEffect(() => { refresh(); }, [refresh]);

  useEffect(() => {
    if (!repoId) return;
    const interval = setInterval(() => { refresh(); }, 10 * 1000);
    return () => clearInterval(interval);
  }, [repoId, refresh]);

  const createTask = useCallback(async (body) => {
    const task = await api.post(`/api/repos/${repoId}/tasks`, body);
    setTasks((prev) => [task, ...prev]);
    return task;
  }, [repoId]);

  const updateTask = useCallback(async (id, body) => {
    const task = await api.patch(`/api/tasks/${id}`, body);
    setTasks((prev) => prev.map((t) => (t.id === id ? task : t)));
    return task;
  }, []);

  const updateStatus = useCallback(async (id, status) => {
    const task = await api.patch(`/api/tasks/${id}/status`, { status });
    setTasks((prev) => prev.map((t) => (t.id === id ? task : t)));
    return task;
  }, []);

  const deleteTask = useCallback(async (id) => {
    await api.delete(`/api/tasks/${id}`);
    setTasks((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return { tasks, loading, error, refresh, createTask, updateTask, updateStatus, deleteTask };
}
