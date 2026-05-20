import { useState, useEffect, useCallback } from 'react';
import { api } from '../lib/api.js';

export function useProjectStats(repoId) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const refresh = useCallback(() => {
    if (!repoId) { setStats(null); return; }
    setLoading(true);
    setError(null);
    api.get(`/api/repos/${repoId}/stats`)
      .then((data) => { setStats(data); setLoading(false); })
      .catch((err) => { setError(err.message); setLoading(false); });
  }, [repoId]);

  useEffect(() => { refresh(); }, [refresh]);

  useEffect(() => {
    if (!repoId) return;
    const interval = setInterval(refresh, 10 * 1000);
    return () => clearInterval(interval);
  }, [repoId, refresh]);

  return { stats, loading, error, refresh };
}
