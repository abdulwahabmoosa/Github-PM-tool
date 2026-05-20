import { useEffect, useState, useCallback } from 'react';
import { api } from '../lib/api.js';

export function useConnectedRepos() {
  const [repos, setRepos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const refresh = useCallback(() => {
    setLoading(true);
    setError(null);
    api.get('/api/repos')
      .then((data) => { setRepos(data); setLoading(false); })
      .catch((err) => { setError(err.message); setLoading(false); });
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  return { repos, loading, error, refresh };
}
