'use client';

import { useState, useRef } from 'react';

interface Props {
  onJoin: (username: string, avatar?: File | null) => void;
  joining?: boolean;
  error?: string;
}

export function JoinScreen({ onJoin, joining, error }: Props) {
  const [username, setUsername] = useState('');
  const [avatar, setAvatar] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleFile(file: File | null) {
    setAvatar(file);
    if (file) setPreview(URL.createObjectURL(file));
    else setPreview(null);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const name = username.trim();
    if (name) onJoin(name, avatar);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50">
      <form
        onSubmit={handleSubmit}
        className="flex flex-col gap-4 rounded-2xl bg-white p-8 shadow-md w-full max-w-sm"
      >
        <h1 className="text-2xl font-semibold text-zinc-900">Join the gallery</h1>
        <p className="text-sm text-zinc-500">Enter your name to start sharing photos.</p>

        {/* Avatar picker */}
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="w-16 h-16 rounded-full bg-zinc-100 border-2 border-dashed border-zinc-300 flex items-center justify-center overflow-hidden hover:border-zinc-400 transition-colors shrink-0"
          >
            {preview
              ? <img src={preview} alt="avatar" className="w-full h-full object-cover" />
              : <span className="text-xs text-zinc-400 text-center leading-tight">Add<br/>photo</span>
            }
          </button>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
          />
          <p className="text-xs text-zinc-400">Optional profile photo</p>
        </div>

        <input
          type="text"
          placeholder="Your name"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          maxLength={32}
          required
          className="rounded-lg border border-zinc-200 px-4 py-2 text-sm outline-none focus:border-zinc-400"
        />

        {error && <p className="text-xs text-red-500">{error}</p>}

        <button
          type="submit"
          disabled={joining}
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50"
        >
          {joining ? 'Joining...' : 'Join'}
        </button>
      </form>
    </div>
  );
}
