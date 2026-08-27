import { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from './useAuth';

export function useAlerts() {
  const [count, setCount] = useState(0);
  const { user } = useAuth();

  useEffect(() => {
    if (!user || user.role === 'STUDENT') return;

    const fetchCount = async () => {
      try {
        const res = await api.get('/alerts/count');
        setCount(res.data.data.count ?? 0);
      } catch {
        // silently fail
      }
    };

    fetchCount();

    const interval = setInterval(
      fetchCount,
      Number(import.meta.env.VITE_ALERTS_POLL_MS) || 15000
    );

    return () => clearInterval(interval);
  }, [user]);

  return { count };
}