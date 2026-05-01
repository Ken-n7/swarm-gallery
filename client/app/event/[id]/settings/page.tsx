'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/hooks/useUser';
import { useOrientation } from '@/hooks/useOrientation';

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
  return (
    <div
      className="flex items-center justify-between px-4 py-4"
      onClick={onClick}
      style={onClick ? { cursor: 'pointer' } : undefined}
    >
      <div className="mr-4">
        <p className="text-[15px] font-semibold text-[var(--ink)]">{title}</p>
        <p className="text-[13px] text-[var(--muted)] mt-0.5">{subtitle}</p>
      </div>
      {right}
    </div>
  );
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

export default function SettingsPage() {
  const router = useRouter();
  const orientation = useOrientation();
  const { user, rename, leave, joining, error } = useUser();

  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [nameError, setNameError] = useState('');

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
    if (!trimmed || trimmed === user?.username) { setEditingName(false); return; }
    setNameError('');
    try {
      await rename(trimmed);
      setEditingName(false);
    } catch (e: unknown) {
      setNameError(e instanceof Error ? e.message : 'Failed to update nickname');
    }
  }

  const header = (
    <header className="flex items-center gap-4 px-4 pt-5 pb-4">
      <button
        onClick={() => router.back()}
        className="w-9 h-9 rounded-full flex items-center justify-center border shrink-0"
        style={{ borderColor: 'var(--line)', background: 'white' }}
      >
        <svg className="w-5 h-5 text-[var(--ink-soft)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      </button>
      <h1 className="text-[22px] font-bold text-[var(--ink)]" style={{ fontFamily: 'var(--font-paytone)' }}>
        Settings
      </h1>
    </header>
  );

  const identitySection = (
    <div className="flex flex-col gap-2">
      <SectionLabel>Your Identity</SectionLabel>
      <Card>
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

  const sharingSection = (
    <div className="flex flex-col gap-2">
      <SectionLabel>Sharing</SectionLabel>
      <Card>
        <Row
          title="Auto-share photos"
          subtitle="Upload instantly after capture"
          right={<Toggle on={true} onChange={() => {}} />}
        />
      </Card>
    </div>
  );

  const privacySection = (
    <div className="flex flex-col gap-2">
      <SectionLabel>Privacy</SectionLabel>
      <Card>
        <Row
          title="Face blur"
          subtitle="Blur your face in all photos"
          right={<Toggle on={true} onChange={() => {}} />}
        />
        <Divider />
        <Row
          title="Auto-delete my photos"
          subtitle="Remove when event ends"
          right={<Toggle on={true} onChange={() => {}} />}
        />
      </Card>
    </div>
  );

  const photosSection = (
    <div className="flex flex-col gap-2">
      <SectionLabel>Your Photos</SectionLabel>
      <div className="rounded-[14px]" style={{ border: '1px solid var(--line)', background: 'white' }}>
        <div className="flex items-center justify-between px-4 py-4">
          <div>
            <p className="text-[15px] font-semibold text-[var(--ink)]">Download all my photos</p>
            <p className="text-[13px] text-[var(--muted)] mt-0.5">Coming soon</p>
          </div>
          <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: 'var(--violet-tint)' }}>
            <svg className="w-4 h-4 text-[var(--violet)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );

  const leaveButton = (
    <>
      {error && <p className="text-[12px] text-center mb-3" style={{ color: 'var(--danger)' }}>{error}</p>}
      <button
        onClick={handleLeave}
        className="w-full py-4 rounded-[14px] flex items-center justify-center gap-2 text-[15px] font-bold border"
        style={{ borderWidth: 1.5, borderColor: 'var(--danger-tint)', color: 'var(--danger)' }}
      >
        Leave Event
      </button>
    </>
  );

  if (orientation === 'landscape') {
    return (
      <div className="h-screen flex flex-col overflow-hidden" style={{ background: 'var(--bg-soft)' }}>
        {header}
        <div className="flex-1 overflow-y-auto">
          <div className="grid gap-x-4 px-4 pb-6" style={{ gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            {/* Left column */}
            <div className="flex flex-col gap-4">
              {identitySection}
              {sharingSection}
            </div>
            {/* Right column */}
            <div className="flex flex-col gap-4">
              {privacySection}
              {photosSection}
              {leaveButton}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen" style={{ background: 'var(--bg-soft)' }}>
      {header}
      <div className="flex-1 flex flex-col px-4 gap-6 pt-4">
        {identitySection}
        {sharingSection}
        {privacySection}
        {photosSection}
      </div>
      <div className="px-4 pb-10 pt-6">
        {leaveButton}
      </div>
    </div>
  );
}
