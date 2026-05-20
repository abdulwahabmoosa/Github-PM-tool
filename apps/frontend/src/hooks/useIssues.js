import { useEffect, useState, useCallback } from 'react';
import { api } from '../lib/api.js';

export function useIssues(repoId) {
  const [issues, setIssues] = useState([]);
  const [fallbackReason, setFallbackReason] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchIssues = useCallback(() => {
    if (!repoId) { setIssues([]); return; }
    setLoading(true);
    setError(null);
    api.get(`/api/repos/${repoId}/issues`)
      .then((data) => {
        setIssues(data.issues);
        setFallbackReason(data.fetched === 'fallback' ? data.reason : null);
        setLoading(false);
      })
      .catch((err) => { setError(err.message); setLoading(false); });
  }, [repoId]);

  useEffect(() => { fetchIssues(); }, [fetchIssues]);

  return { issues, fallbackReason, loading, error };
}
