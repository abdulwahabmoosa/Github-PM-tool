import { useState, useEffect, useCallback } from 'react';
import { api } from '../lib/api.js';

const EMPTY = { active: [], available: [], ownerNotInGitHub: false, removedCount: 0 };

export function useMembers(repoId) {
  const [data, setData] = useState(EMPTY);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const refresh = useCallback(() => {
    if (!repoId) { setData(EMPTY); return; }
    setLoading(true);
    setError(null);
    api.get(`/api/repos/${repoId}/members`)
      .then((d) => { setData(d); setLoading(false); })
      .catch((e) => { setError(e.message); setLoading(false); });
  }, [repoId]);

  useEffect(() => { refresh(); }, [refresh]);

  const updateRole = useCallback(async (userId, role) => {
    await api.patch(`/api/repos/${repoId}/members/${userId}/role`, { role });
    refresh();
  }, [repoId, refresh]);

  const removeMember = useCallback(async (userId) => {
    await api.delete(`/api/repos/${repoId}/members/${userId}`);
    refresh();
  }, [repoId, refresh]);

  const addMember = useCallback(async (githubLogin) => {
    await api.post(`/api/repos/${repoId}/members`, { githubLogin });
    refresh();
  }, [repoId, refresh]);

  const syncWithGitHub = useCallback(async () => {
    if (!repoId) return null;
    setLoading(true);
    setError(null);
    try {
      const d = await api.get(`/api/repos/${repoId}/members?fresh=true`);
      setData(d);
      setLoading(false);
      return d;
    } catch (e) {
      setError(e.message);
      setLoading(false);
      throw e;
    }
  }, [repoId]);

  return {
    ...data,
    members: data.active, // backward-compat alias
    loading,
    error,
    refresh,
    updateRole,
    removeMember,
    addMember,
    syncWithGitHub,
  };
}
