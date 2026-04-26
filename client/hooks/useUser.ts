'use client';

import { useState, useEffect } from 'react';
import { User } from '@/types';

const STORAGE_KEY = 'swarm-gallery-user';

export function useUser() {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setUser(JSON.parse(raw));
    } catch {
      // localStorage blocked (private mode, restricted browser)
    }
  }, []);

  function join(username: string) {
    const u: User = { username };
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(u)); } catch { /* ignore */ }
    setUser(u);
  }

  function leave() {
    try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
    setUser(null);
  }

  return { user, join, leave };
}
