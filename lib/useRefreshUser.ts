'use client';

import { useEffect } from 'react';
import { useAuthStore } from '@/lib/store';
import { api } from '@/lib/api';

export function useRefreshUser() {
  const { token, setUser } = useAuthStore();

  useEffect(() => {
    if (!token) return;

    api.auth.me()
      .then(userData => {
        setUser(userData);
      })
      .catch(err => {
        console.warn('[useRefreshUser] Failed to refresh user:', err?.error || err);
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);
}