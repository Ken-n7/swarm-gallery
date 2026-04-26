'use client';

import { useState } from 'react';
import { UserAvatar } from './UserAvatar';

interface Props {
  eventName?: string;
  guestCount?: number;
  onJoin: (username: string, avatar?: File | null) => void;
  joining?: boolean;
  error?: string;
}

export function JoinScreen({ eventName = 'Swarm Gallery Event', guestCount, onJoin, joining, error }: Props) {
  const [username, setUsername] = useState('');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const name = username.trim();
    if (name) onJoin(name);
  }

  return (
    <div className="flex flex-col min-h-screen bg-white items-center justify-center px-6">
      <div className="w-full max-w-sm flex flex-col items-center gap-5">

        {/* Event avatar */}
        <UserAvatar username={eventName} size="xl" neon />

        {/* Event info */}
        <div className="text-center">
          <p className="text-sm text-zinc-400 mb-1">Welcome to</p>
          <h1 className="text-3xl font-black text-zinc-900 leading-tight">{eventName}</h1>
          <p className="text-sm text-zinc-400 mt-1">Swarm Gallery · Offline event</p>
        </div>

        {/* Guest count badge */}
        {guestCount !== undefined && guestCount > 0 && (
          <div className="flex items-center gap-1.5 bg-green-50 border border-green-200 rounded-full px-4 py-1.5">
            <span className="w-2 h-2 rounded-full bg-green-500 shrink-0" />
            <span className="text-sm text-green-700 font-medium">{guestCount} guests already inside</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="w-full flex flex-col gap-3 mt-2">
          <div className="rounded-2xl border-2 border-violet-300 px-4 py-3 focus-within:border-violet-500 transition-colors">
            <label className="block text-xs text-violet-500 font-medium mb-0.5">Enter</label>
            <input
              type="text"
              placeholder="Your nickname"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              maxLength={32}
              required
              className="w-full text-base text-zinc-900 outline-none bg-transparent placeholder:text-zinc-300"
            />
          </div>

          {error && <p className="text-sm text-red-500 text-center">{error}</p>}

          <button
            type="submit"
            disabled={joining}
            className="w-full bg-zinc-900 text-white font-bold text-base py-4 rounded-2xl hover:bg-zinc-700 disabled:opacity-50 transition-colors"
          >
            {joining ? 'Joining...' : 'Join the celebration'}
          </button>
        </form>
      </div>
    </div>
  );
}
