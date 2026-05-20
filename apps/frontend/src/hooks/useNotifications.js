import { useState, useEffect, useCallback } from 'react';
import { api } from '../lib/api.js';

export function useNotifications(limit = 10) {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [list, count] = await Promise.all([
        api.get(`/api/notifications?limit=${limit}`),
        api.get('/api/notifications/unread-count'),
      ]);
      setNotifications(list);
      setUnreadCount(count.count);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [limit]);

  useEffect(() => { refresh(); }, [refresh]);

  useEffect(() => {
    const interval = setInterval(refresh, 10000);
    return () => clearInterval(interval);
  }, [refresh]);

  const markRead = useCallback(async (id) => {
    await api.patch(`/api/notifications/${id}/read`);
    setNotifications((prev) =>
      prev.map((n) => n.id === id ? { ...n, readAt: new Date().toISOString() } : n)
    );
    setUnreadCount((c) => Math.max(0, c - 1));
  }, []);

  const markAllRead = useCallback(async () => {
    await api.patch('/api/notifications/read-all');
    setNotifications((prev) =>
      prev.map((n) => n.readAt ? n : { ...n, readAt: new Date().toISOString() })
    );
    setUnreadCount(0);
  }, []);

  return { notifications, unreadCount, loading, error, refresh, markRead, markAllRead };
}
