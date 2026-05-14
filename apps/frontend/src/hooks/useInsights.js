import { useState, useEffect, useCallback } from 'react';
import { api } from '../lib/api.js';

export function useInsights(repoId) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const refresh = useCallback(() => {
    if (!repoId) { setData(null); return; }
    setLoading(true);
    setError(null);
    api.get(`/api/repos/${repoId}/insights`)
      .then((d) => { setData(d); setLoading(false); })
      .catch((e) => { setError(e.message); setLoading(false); });
  }, [repoId]);

  useEffect(() => { refresh(); }, [refresh]);

  return { data, loading, error, refresh };
}
