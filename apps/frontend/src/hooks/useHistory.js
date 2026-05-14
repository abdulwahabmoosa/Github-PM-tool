import { useState, useEffect, useCallback } from 'react';
import { api } from '../lib/api.js';

export function useHistory(taskId) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const refresh = useCallback(() => {
    if (!taskId) { setHistory([]); return; }
    setLoading(true);
    setError(null);
    api.get(`/api/tasks/${taskId}/history`)
      .then((data) => { setHistory(data); setLoading(false); })
      .catch((err) => { setError(err.message); setLoading(false); });
  }, [taskId]);

  useEffect(() => { refresh(); }, [refresh]);

  return { history, loading, error, refresh };
}
