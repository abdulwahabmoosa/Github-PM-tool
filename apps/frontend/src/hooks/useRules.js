import { useState, useEffect, useCallback } from 'react';
import { api } from '../lib/api.js';

export function useRules(repoId) {
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const refresh = useCallback(() => {
    if (!repoId) { setRules([]); return; }
    setLoading(true);
    setError(null);
    api.get(`/api/repos/${repoId}/rules`)
      .then((data) => { setRules(data); setLoading(false); })
      .catch((err) => { setError(err.message); setLoading(false); });
  }, [repoId]);

  useEffect(() => { refresh(); }, [refresh]);

  const toggleRule = useCallback(async (ruleType, enabled) => {
    const updated = await api.patch(
      `/api/repos/${repoId}/rules/${ruleType}`,
      { enabled }
    );
    setRules((prev) => prev.map((r) => (r.ruleType === ruleType ? updated : r)));
    return updated;
  }, [repoId]);

  return { rules, loading, error, refresh, toggleRule };
}
