import { useEffect, useState, useCallback } from 'react';
import { api } from '../lib/api.js';

export function useCollaborators(repoId) {
  const [collaborators, setCollaborators] = useState([]);
  const [fallbackReason, setFallbackReason] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const refresh = useCallback(() => {
    if (!repoId) { setCollaborators([]); return; }
    setLoading(true);
    setError(null);
    api.get(`/api/repos/${repoId}/collaborators`)
      .then((data) => {
        setCollaborators(data.collaborators);
        setFallbackReason(data.fetched === 'fallback' ? data.reason : null);
        setLoading(false);
      })
      .catch((err) => { setError(err.message); setLoading(false); });
  }, [repoId]);

  useEffect(() => { refresh(); }, [refresh]);

  return { collaborators, fallbackReason, loading, error, refresh };
}
