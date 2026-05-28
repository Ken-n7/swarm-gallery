'use client';

import { useParams, useRouter } from 'next/navigation';
import { useOrientation } from '@/hooks/useOrientation';
import { GuestSettingsContent } from '@/components/GuestSettingsContent';

export default function SettingsPage() {
  const router = useRouter();
  const params = useParams();
  const eventId = (params.id as string) || 'demo';
  const orientation = useOrientation();

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
      <h1 className="text-[22px] font-bold text-[var(--ink)]" style={{ fontFamily: 'var(--font-paytone)' }}>Settings</h1>
    </header>
  );

  if (orientation === 'landscape') {
    return (
      <div className="h-screen flex flex-col overflow-hidden" style={{ background: 'var(--bg-soft)' }}>
        {header}
        <div className="flex-1 overflow-y-auto">
          <GuestSettingsContent eventId={eventId} layout="double" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen" style={{ background: 'var(--bg-soft)' }}>
      {header}
      <GuestSettingsContent eventId={eventId} layout="single" />
    </div>
  );
}
