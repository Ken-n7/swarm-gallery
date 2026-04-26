'use client';

import { useState } from 'react';

interface Props {
  onJoin: (username: string) => void;
}

export function JoinScreen({ onJoin }: Props) {
  const [username, setUsername] = useState('');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const name = username.trim();
    if (name) onJoin(name);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50">
      <form
        onSubmit={handleSubmit}
        className="flex flex-col gap-4 rounded-2xl bg-white p-8 shadow-md w-full max-w-sm"
      >
        <h1 className="text-2xl font-semibold text-zinc-900">Join the gallery</h1>
        <p className="text-sm text-zinc-500">Enter a name to start sharing photos.</p>
        <input
          type="text"
          placeholder="Your name"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          maxLength={32}
          required
          className="rounded-lg border border-zinc-200 px-4 py-2 text-sm outline-none focus:border-zinc-400"
        />
        <button
          type="submit"
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700"
        >
          Join
        </button>
      </form>
    </div>
  );
}
