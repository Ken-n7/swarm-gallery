'use client';

import { useState, useRef } from 'react';
import { UserAvatar } from './UserAvatar';
import { AvatarCropModal } from './AvatarCropModal';

interface Props {
  eventName?: string;
  guestCount?: number;
  onJoin: (username: string, avatar?: File | null) => void;
  joining?: boolean;
  error?: string;
}

export function JoinScreen({ eventName = 'Swarm Gallery Event', guestCount, onJoin, joining, error }: Props) {
  const [username, setUsername] = useState('');
  const [localError, setLocalError] = useState('');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const avatarRef = useRef<HTMLInputElement>(null);

  function validateName(value: string) {
    const trimmed = value.trim().replace(/\s+/g, ' ');
    if (!trimmed) return 'Enter a nickname to join';
    if (trimmed.length < 2) return 'Use at least 2 characters';
    return '';
  }

  function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    // Open the crop modal instead of using the file directly
    if (cropSrc) URL.revokeObjectURL(cropSrc);
    setCropSrc(URL.createObjectURL(file));
    e.target.value = '';
  }

  function handleCropConfirm(blob: Blob) {
    if (avatarPreview) URL.revokeObjectURL(avatarPreview);
    const preview = URL.createObjectURL(blob);
    const file = new File([blob], 'avatar.jpg', { type: 'image/jpeg' });
    setAvatarFile(file);
    setAvatarPreview(preview);
    if (cropSrc) URL.revokeObjectURL(cropSrc);
    setCropSrc(null);
  }

  function handleCropCancel() {
    if (cropSrc) URL.revokeObjectURL(cropSrc);
    setCropSrc(null);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const name = username.trim().replace(/\s+/g, ' ');
    const validationError = validateName(name);
    if (validationError) {
      setLocalError(validationError);
      return;
    }
    setLocalError('');
    onJoin(name, avatarFile);
  }

  const initials = username.trim()
    ? username.trim().split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2)
    : '?';

  return (
    <div
      className="flex flex-col min-h-screen items-center justify-center px-6 py-10"
      style={{
        background:
          'radial-gradient(circle at top, rgba(139,92,246,.14), transparent 36%), linear-gradient(180deg, #ffffff 0%, #f8f7ff 100%)',
      }}
    >
      <div
        className="w-full max-w-sm sm:max-w-md flex flex-col items-center gap-5 rounded-[28px] px-6 py-7 border shadow-[0_24px_80px_rgba(15,23,42,.08)]"
        style={{ background: 'rgba(255,255,255,.94)', borderColor: 'rgba(139,92,246,.12)', backdropFilter: 'blur(14px)' }}
      >

        {/* Event info */}
        <div className="text-center">
          <p className="text-sm text-zinc-400 mb-1">Welcome to</p>
          <h1 className="text-3xl font-black text-zinc-900 leading-tight">{eventName}</h1>
          <p className="text-sm text-zinc-400 mt-1">Swarm Gallery · Offline event</p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-2">
          <div className="rounded-full px-3 py-1.5 text-[11px] font-semibold" style={{ background: 'var(--violet-tint)', color: 'var(--violet-dark)' }}>
            Fast local sharing
          </div>
          <div className="rounded-full px-3 py-1.5 text-[11px] font-semibold" style={{ background: '#ecfeff', color: '#0f766e' }}>
            Privacy-first handoff
          </div>
        </div>

        {/* Guest count badge */}
        {guestCount !== undefined && guestCount > 0 && (
          <div className="flex items-center gap-1.5 bg-green-50 border border-green-200 rounded-full px-4 py-1.5">
            <span className="w-2 h-2 rounded-full bg-green-500 shrink-0" />
            <span className="text-sm text-green-700 font-medium">{guestCount} guests already inside</span>
          </div>
        )}

        {/* Avatar picker */}
        <div className="flex flex-col items-center gap-2">
          <button
            type="button"
            onClick={() => avatarRef.current?.click()}
            className="relative group"
            aria-label="Choose profile photo"
          >
            {/* Avatar circle */}
            <div className="w-24 h-24 rounded-full overflow-hidden relative flex items-center justify-center font-bold text-white text-3xl"
              style={{ background: avatarPreview ? 'transparent' : 'var(--neon-gradient)' }}>
              {avatarPreview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatarPreview} alt="Your avatar" className="w-full h-full object-cover" />
              ) : (
                <span>{initials}</span>
              )}
            </div>
            {/* Camera badge */}
            <div
              className="absolute bottom-0 right-0 w-8 h-8 rounded-full flex items-center justify-center border-2 border-white transition-colors group-hover:opacity-90"
              style={{ background: 'var(--violet)' }}
            >
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" />
              </svg>
            </div>
          </button>
          <p className="text-[11px]" style={{ color: 'var(--muted)' }}>
            {avatarPreview ? 'Tap to change photo' : 'Add a profile photo (optional)'}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="w-full flex flex-col gap-3">
          <div className="rounded-2xl border-2 border-violet-300 px-4 py-3 focus-within:border-violet-500 transition-colors">
            <label className="block text-xs text-violet-500 font-medium mb-0.5">Nickname</label>
            <input
              type="text"
              placeholder="Your nickname"
              value={username}
              onChange={(e) => {
                setUsername(e.target.value);
                if (localError) setLocalError('');
              }}
              maxLength={32}
              required
              className="w-full text-base text-zinc-900 outline-none bg-transparent placeholder:text-zinc-300"
            />
          </div>

          {(localError || error) && <p className="text-sm text-red-500 text-center">{localError || error}</p>}

          <button
            type="submit"
            disabled={joining || !username.trim()}
            className="w-full text-white font-bold text-base py-4 rounded-2xl disabled:opacity-50 transition-opacity active:scale-[.98]"
            style={{ background: 'var(--neon-gradient)', boxShadow: '0 6px 24px rgba(124,58,237,.4)' }}
          >
            {joining ? 'Joining...' : 'Join the celebration'}
          </button>
        </form>

        <p className="text-[12px] text-center leading-5 text-zinc-400">
          Pick a nickname and you&apos;re in. Photos stay local to this event until handoff.
        </p>
      </div>

      {/* Hidden avatar file input */}
      <input
        ref={avatarRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleAvatarChange}
      />

      {/* Crop modal — rendered outside the card so it covers the full screen */}
      {cropSrc && (
        <AvatarCropModal
          src={cropSrc}
          onConfirm={handleCropConfirm}
          onCancel={handleCropCancel}
        />
      )}
    </div>
  );
}
