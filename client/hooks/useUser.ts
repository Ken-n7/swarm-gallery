'use client';

import { useState, useEffect } from 'react';
import { User } from '@/types';
import { joinEvent, changeUsername, checkDevice, updateAvatar as updateAvatarApi } from '@/lib/api';

const STORAGE_KEY = 'swarm-gallery-user';
const DEVICE_KEY  = 'swarm-gallery-device-id';

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

function generateId(): string {
  // crypto.randomUUID requires a secure context (HTTPS/localhost) — not available over HTTP hotspot
  try {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  } catch { /* not in secure context */ }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
}

export function getOrCreateDeviceId(): string {
  try {
    let id = localStorage.getItem(DEVICE_KEY);
    if (!id) {
      id = generateId();
      localStorage.setItem(DEVICE_KEY, id);
    }
    return id;
  } catch {
    return generateId();
  }
}


export function useUser() {
  // Lazy init — reads localStorage synchronously for optimistic render
  const [user, setUser] = useState<User | null>(() => {
    if (typeof window === 'undefined') return null;
    return load();
  });

  // Always validate against server on mount — catches stale localStorage after DB reset
  const [checking, setChecking] = useState(true);

  const [joining, setJoining] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const deviceId = getOrCreateDeviceId();

    checkDevice(deviceId)
      .then((result) => {
        if (result) {
          // Device known — use fresh server data (handles username changes etc.)
          const u: User = {
            userId: result.userId,
            username: result.username,
            avatarUrl: result.avatarUrl,
          };
          save(u);
          setUser(u);
        } else {
          // 404 — device not in DB (reset or truly new), force re-join
          clear();
          setUser(null);
        }
      })
      .catch(() => {
        // Server unreachable — keep whatever localStorage says (don't force logout)
      })
      .finally(() => setChecking(false));
  }, []);

  async function join(username: string, avatar?: File | null) {
    setJoining(true);
    setError('');
    try {
      const deviceId = getOrCreateDeviceId();
      const result = await joinEvent({
        username,
        avatar,
        userId: user?.userId,
        deviceId,
      });
      const u: User = {
        userId: result.userId,
        username: result.username,
        avatarUrl: result.avatarUrl,
      };
      save(u);
      setUser(u);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : '';
      setError(msg || 'Could not join. Is the server running?');
    } finally {
      setJoining(false);
    }
  }

  async function rename(newUsername: string) {
    if (!user) return;
    setJoining(true);
    setError('');
    try {
      const result = await changeUsername(user.userId, newUsername);
      const u = { ...user, username: result.username };
      save(u);
      setUser(u);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : '';
      setError(msg || 'Failed to update nickname');
      throw e;
    } finally {
      setJoining(false);
    }
  }

  async function updateAvatar(avatarFile: File) {
    if (!user) return;
    setJoining(true);
    setError('');
    try {
      const result = await updateAvatarApi(user.userId, avatarFile);
      const u = { ...user, avatarUrl: result.avatarUrl };
      save(u);
      setUser(u);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : '';
      setError(msg || 'Failed to update photo');
      throw e;
    } finally {
      setJoining(false);
    }
  }

  function leave() {
    clear();
    setUser(null);
    // deviceId intentionally kept — device identity persists across events
  }

  return { user, join, rename, updateAvatar, leave, joining, checking, error };
}
