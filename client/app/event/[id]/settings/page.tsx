'use client';

import { useRouter } from 'next/navigation';
import { useUser } from '@/hooks/useUser';

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
}

function Row({ title, subtitle, right }: RowProps) {
  return (
    <div className="flex items-center justify-between px-4 py-4">
      <div className="mr-4">
        <p className="text-[15px] font-semibold text-[var(--ink)]">{title}</p>
        <p className="text-[13px] text-[var(--muted)] mt-0.5">{subtitle}</p>
      </div>
      {right}
    </div>
  );
}

export default function SettingsPage() {
  const router = useRouter();
  const { user, leave } = useUser();

  function handleLeave() {
    leave();
    router.replace('/');
  }

  return (
    <div className="flex flex-col min-h-screen" style={{ background: 'var(--bg-soft)' }}>
      {/* Header */}
      <header className="flex items-center gap-4 px-4 pt-6 pb-4">
        <button
          onClick={() => router.back()}
          className="w-9 h-9 rounded-full flex items-center justify-center border"
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

      <div className="flex-1 flex flex-col px-4 gap-6 pt-4">
        {/* Sharing section */}
        <div className="flex flex-col gap-2">
          <p
            className="text-[10px] font-bold uppercase tracking-widest px-1"
            style={{ color: 'var(--violet)', letterSpacing: '0.08em' }}
          >
            Sharing
          </p>
          <div
            className="rounded-[14px] overflow-hidden"
            style={{ border: '1px solid var(--line)', background: 'white' }}
          >
            <Row
              title="Auto-share photos"
              subtitle="Upload instantly after capture"
              right={<Toggle on={true} onChange={() => {}} />}
            />
            <div style={{ height: 1, background: 'var(--line)' }} />
            <Row
              title="Visible to other guests"
              subtitle={`${user?.username ?? '—'} · tap to edit`}
              right={<Toggle on={false} onChange={() => {}} />}
            />
          </div>
        </div>

        {/* Privacy section */}
        <div className="flex flex-col gap-2">
          <p
            className="text-[10px] font-bold uppercase tracking-widest px-1"
            style={{ color: 'var(--violet)', letterSpacing: '0.08em' }}
          >
            Privacy
          </p>
          <div
            className="rounded-[14px] overflow-hidden"
            style={{ border: '1px solid var(--line)', background: 'white' }}
          >
            <Row
              title="Face blur"
              subtitle="Blur your face in all photos"
              right={<Toggle on={true} onChange={() => {}} />}
            />
            <div style={{ height: 1, background: 'var(--line)' }} />
            <Row
              title="Auto-delete my photos"
              subtitle="Remove when event ends"
              right={<Toggle on={true} onChange={() => {}} />}
            />
          </div>
        </div>

        {/* My photos section */}
        <div className="flex flex-col gap-2">
          <p
            className="text-[10px] font-bold uppercase tracking-widest px-1"
            style={{ color: 'var(--violet)', letterSpacing: '0.08em' }}
          >
            Your Photos
          </p>
          <div
            className="rounded-[14px]"
            style={{ border: '1px solid var(--line)', background: 'white' }}
          >
            <div className="flex items-center justify-between px-4 py-4">
              <div>
                <p className="text-[15px] font-semibold text-[var(--ink)]">Download all my photos</p>
                <p className="text-[13px] text-[var(--muted)] mt-0.5">Coming soon</p>
              </div>
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center"
                style={{ background: 'var(--violet-tint)' }}
              >
                <svg className="w-4 h-4 text-[var(--violet)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Leave event */}
      <div className="px-4 pb-10 pt-6">
        <button
          onClick={handleLeave}
          className="w-full py-4 rounded-[14px] flex items-center justify-center gap-2 text-[15px] font-bold border"
          style={{
            borderWidth: 1.5,
            borderColor: 'var(--danger-tint)',
            color: 'var(--danger)',
          }}
        >
          Leave Event
        </button>
      </div>
    </div>
  );
}
