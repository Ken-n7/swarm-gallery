'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/hooks/useUser';
import { useGuestPreferences } from '@/hooks/useGuestPreferences';
import { SERVER, photoUrl } from '@/lib/api';
import { AvatarCropModal } from '@/components/AvatarCropModal';

interface ToggleProps {
  on: boolean;
  onChange: (v: boolean) => void;
}

function Toggle({ on, onChange }: ToggleProps) {
  return (
    <button
      role="switch"
      aria-checked={on}
      onClick={() => onChange(!on)}
      className="relative shrink-0 transition-colors"
      style={{
        width: 44,
        height: 24,
        borderRadius: 12,
        background: on ? 'var(--violet)' : 'var(--line)',
      }}
    >
      <div
        className="absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all duration-200"
        style={{ left: on ? 'calc(100% - 22px)' : 2 }}
      />
    </button>
  );
}

interface RowProps {
  title: string;
  subtitle: string;
  right?: React.ReactNode;
  onClick?: () => void;
}

function Row({ title, subtitle, right, onClick }: RowProps) {
  const content = (
    <>
      <div className="flex-1 min-w-0 mr-4 text-left">
        <p className="text-[15px] font-semibold text-[var(--ink)]">{title}</p>
        <p className="text-[13px] text-[var(--muted)] mt-0.5">{subtitle}</p>
      </div>
      {right}
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        className="w-full flex items-center justify-between px-4 py-4 text-left"
        onClick={onClick}
      >
        {content}
      </button>
    );
  }

  return <div className="flex items-center justify-between px-4 py-4">{content}</div>;
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p
      className="text-[10px] font-bold uppercase tracking-widest px-1"
      style={{ color: 'var(--violet)', letterSpacing: '0.08em' }}
    >
      {children}
    </p>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="rounded-[14px] overflow-hidden"
      style={{ border: '1px solid var(--line)', background: 'white' }}
    >
      {children}
    </div>
  );
}

function Divider() {
  return <div style={{ height: 1, background: 'var(--line)' }} />;
}

export function GuestSettingsContent({
  eventId,
  layout = 'single',
}: {
  eventId: string;
  layout?: 'single' | 'double';
}) {
  const router = useRouter();
  const { user, rename, updateAvatar, leave, joining, error } = useUser();
  const { faceBlurEnabled, setFaceBlurEnabled } = useGuestPreferences();

  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [nameError, setNameError] = useState('');

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarError, setAvatarError] = useState('');
  const [cropSrc, setCropSrc] = useState<string | null>(null);

  function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (cropSrc) URL.revokeObjectURL(cropSrc);
    setCropSrc(URL.createObjectURL(file));
    e.target.value = '';
  }

  async function handleCropConfirm(blob: Blob) {
    if (cropSrc) URL.revokeObjectURL(cropSrc);
    setCropSrc(null);
    setAvatarError('');
    setAvatarUploading(true);
    try {
      const file = new File([blob], 'avatar.jpg', { type: 'image/jpeg' });
      await updateAvatar(file);
    } catch (err: unknown) {
      setAvatarError(err instanceof Error ? err.message : 'Failed to update photo');
    } finally {
      setAvatarUploading(false);
    }
  }

  function handleCropCancel() {
    if (cropSrc) URL.revokeObjectURL(cropSrc);
    setCropSrc(null);
  }

  function handleLeave() {
    leave();
    router.replace('/');
  }

  function startEdit() {
    setNameInput(user?.username ?? '');
    setNameError('');
    setEditingName(true);
  }

  async function submitRename(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const trimmed = nameInput.trim();
    if (!trimmed || trimmed === user?.username) {
      setEditingName(false);
      return;
    }
    setNameError('');
    try {
      await rename(trimmed);
      setEditingName(false);
    } catch (err: unknown) {
      setNameError(err instanceof Error ? err.message : 'Failed to update nickname');
    }
  }

  const identitySection = (
    <div className="flex flex-col gap-2">
      <SectionLabel>Your Identity</SectionLabel>
      <Card>
        {/* Avatar row */}
        <button
          type="button"
          onClick={() => avatarInputRef.current?.click()}
          disabled={avatarUploading}
          className="w-full flex items-center justify-between px-4 py-4 disabled:opacity-60"
        >
          <div className="flex-1 min-w-0 mr-4 text-left">
            <p className="text-[15px] font-semibold text-[var(--ink)]">Profile photo</p>
            <p className="text-[13px] text-[var(--muted)] mt-0.5">
              {avatarUploading ? 'Uploading…' : 'Tap to change'}
            </p>
            {avatarError && <p className="text-[12px] mt-0.5" style={{ color: 'var(--danger)' }}>{avatarError}</p>}
          </div>
          <div className="relative shrink-0">
            <div className="w-12 h-12 rounded-full overflow-hidden flex items-center justify-center font-bold text-white text-lg"
              style={{ background: user?.avatarUrl ? 'transparent' : 'var(--neon-gradient)' }}>
              {user?.avatarUrl
                ? <img src={photoUrl(user.avatarUrl)} alt="" className="w-full h-full object-cover" />
                : (user?.username ?? '?').split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2)
              }
            </div>
            <div className="absolute bottom-0 right-0 w-5 h-5 rounded-full flex items-center justify-center border-2 border-white"
              style={{ background: 'var(--violet)' }}>
              <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" />
              </svg>
            </div>
          </div>
        </button>
        <Divider />
        {editingName ? (
          <form onSubmit={submitRename} className="px-4 py-4 flex flex-col gap-2">
            <p className="text-[15px] font-semibold text-[var(--ink)]">Change nickname</p>
            <input
              autoFocus
              type="text"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              maxLength={32}
              placeholder="New nickname"
              className="w-full border rounded-[10px] px-3 py-2 text-[14px] text-[var(--ink)] outline-none"
              style={{ borderColor: 'var(--violet)', background: 'var(--violet-tint)' }}
            />
            {nameError && <p className="text-[12px]" style={{ color: 'var(--danger)' }}>{nameError}</p>}
            <div className="flex gap-2 mt-1">
              <button
                type="submit"
                disabled={joining}
                className="flex-1 py-2 rounded-[10px] text-[13px] font-bold text-white"
                style={{ background: 'var(--violet)' }}
              >
                {joining ? 'Saving…' : 'Save'}
              </button>
              <button
                type="button"
                onClick={() => setEditingName(false)}
                className="flex-1 py-2 rounded-[10px] text-[13px] font-semibold border"
                style={{ borderColor: 'var(--line)', color: 'var(--ink-soft)' }}
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <Row
            title="Nickname"
            subtitle={`${user?.username ?? '—'} · tap to change`}
            onClick={startEdit}
            right={
              <svg className="w-4 h-4 shrink-0" style={{ color: 'var(--muted)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
            }
          />
        )}
      </Card>
    </div>
  );

  const privacySection = (
    <div className="flex flex-col gap-2">
      <SectionLabel>Privacy</SectionLabel>
      <Card>
        <Row
          title="Blur faces before sharing"
          subtitle="Review and blur faces in your photos before they appear in the gallery"
          right={<Toggle on={faceBlurEnabled} onChange={setFaceBlurEnabled} />}
        />
      </Card>
    </div>
  );

  const photosSection = (
    <div className="flex flex-col gap-2">
      <SectionLabel>Your Photos</SectionLabel>
      <div className="rounded-[14px]" style={{ border: '1px solid var(--line)', background: 'white' }}>
        <a
          href={user ? `${SERVER}/users/${user.userId}/album?eventId=${eventId}` : undefined}
          download="my-album.zip"
          target="_blank"
          rel="noreferrer"
          className="flex items-center justify-between px-4 py-4"
        >
          <div>
            <p className="text-[15px] font-semibold text-[var(--ink)]">Download all my photos</p>
            <p className="text-[13px] text-[var(--muted)] mt-0.5">Downloads on desktop and opens in-browser where mobile download is limited</p>
          </div>
          <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: 'var(--violet-tint)' }}>
            <svg className="w-4 h-4 text-[var(--violet)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
          </div>
        </a>
      </div>
    </div>
  );

  const leaveButton = (
    <>
      {error && <p className="text-[12px] text-center mb-3" style={{ color: 'var(--danger)' }}>{error}</p>}
      <button
        onClick={handleLeave}
        className="w-full py-3 text-[13px] font-medium"
        style={{ color: 'var(--muted)' }}
      >
        Leave event
      </button>
    </>
  );

  if (layout === 'double') {
    return (
      <div className="flex justify-center px-4 pb-8 pt-2">
        <div className="flex flex-col gap-5 w-full" style={{ maxWidth: 520 }}>
          {identitySection}
          {privacySection}
          {photosSection}
          <div>{leaveButton}</div>
        </div>
        <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
        {cropSrc && <AvatarCropModal src={cropSrc} onConfirm={handleCropConfirm} onCancel={handleCropCancel} />}
      </div>
    );
  }

  return (
    <div className="flex flex-col px-4 gap-6 pt-4 pb-8">
      {identitySection}
      {privacySection}
      {photosSection}
      <div>{leaveButton}</div>
      <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
      {cropSrc && <AvatarCropModal src={cropSrc} onConfirm={handleCropConfirm} onCancel={handleCropCancel} />}
    </div>
  );
}
