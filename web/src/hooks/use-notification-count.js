import { useState, useEffect, useCallback, useRef } from 'react';
import { API } from '../lib/api';

const POLL_INTERVAL = 30000; // 30 seconds

export function useNotificationCount(isLoggedIn) {
  const [unreadCount, setUnreadCount] = useState(0);
  const timerRef = useRef(null);

  const fetchCount = useCallback(async () => {
    if (!isLoggedIn) return;
    try {
      const res = await API.get('/api/social/notifications/unread-count');
      if (res.data.success) {
        setUnreadCount(res.data.data.count || 0);
      }
    } catch {
      // Silently ignore polling errors
    }
  }, [isLoggedIn]);

  const refresh = useCallback(() => {
    fetchCount();
  }, [fetchCount]);

  useEffect(() => {
    if (!isLoggedIn) {
      setUnreadCount(0);
      return;
    }

    fetchCount();

    const startPolling = () => {
      timerRef.current = setInterval(fetchCount, POLL_INTERVAL);
    };

    const stopPolling = () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };

    startPolling();

    const handleVisibility = () => {
      if (document.hidden) {
        stopPolling();
      } else {
        fetchCount();
        startPolling();
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      stopPolling();
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [isLoggedIn, fetchCount]);

  return { unreadCount, refresh };
}
