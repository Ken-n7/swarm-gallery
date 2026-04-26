'use client';

import { useState, useEffect } from 'react';
import { User } from '@/types';
import { joinEvent } from '@/lib/api';

const STORAGE_KEY = 'swarm-gallery-user';

function load(): User | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function save(user: User) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(user)); } catch { /* ignore */ }
}

function clear() {
  try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
}

export function useUser() {
  const [user, setUser] = useState<User | null>(null);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const saved = load();
    if (saved) setUser(saved);
  }, []);

  async function join(username: string, avatar?: File | null) {
    setJoining(true);
    setError('');
    try {
      const result = await joinEvent({ username, avatar, userId: user?.userId });
      const u: User = {
        userId: result.userId,
        username: result.username,
        avatarUrl: result.avatarUrl,
      };
      save(u);
      setUser(u);
    } catch {
      setError('Could not join. Is the server running?');
    } finally {
      setJoining(false);
    }
  }

  function leave() {
    clear();
    setUser(null);
  }

  return { user, join, leave, joining, error };
}
