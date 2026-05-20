import { useEffect, useState, useCallback } from 'react';
import { api } from '../lib/api.js';

export function useAuth() {
  const [user, setUser] = useState(undefined);
  const [loading, setLoading] = useState(true);

  const fetchUser = useCallback(() => {
    setLoading(true);
    api.get('/api/me')
      .then((u) => { setUser(u); setLoading(false); })
      .catch((err) => {
        if (err.status === 401) setUser(null);
        setLoading(false);
      });
  }, []);

  useEffect(() => { fetchUser(); }, [fetchUser]);

  function logout() {
    api.post('/auth/logout').finally(() => window.location.reload());
  }

  return { user, loading, refresh: fetchUser, logout };
}
