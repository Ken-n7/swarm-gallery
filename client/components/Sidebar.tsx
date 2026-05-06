'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Photo } from '@/types';
import { GalleryFilter } from './Gallery';
import { useGuestPreferences } from '@/hooks/useGuestPreferences';

interface Props {
  username: string;
  eventId: string;
  userCount: number;
  photos: Photo[];
  filter: GalleryFilter;
  onFilterChange: (f: GalleryFilter) => void;
  onLeave: () => void;
  // Portrait drawer mode
  open?: boolean;
  onClose?: () => void;
}

interface StatCardProps {
  value: string | number;
  label: string;
  highlight?: boolean;
}

function StatCard({ value, label, highlight }: StatCardProps) {
  return (
    <div
      className="flex flex-col p-2.5 rounded-xl"
      style={{ background: 'rgba(255,255,255,.06)' }}
    >
      <span
        className="text-lg font-black leading-none"
        style={{ color: highlight ? 'var(--violet)' : 'white' }}
      >
        {highlight && typeof value === 'number' && value > 0 ? `+${value}` : value}
      </span>
      <span className="text-[11px] mt-0.5" style={{ color: 'rgba(255,255,255,.45)' }}>
        {label}
      </span>
    </div>
  );
}

const NAV: { key: GalleryFilter; label: string; icon: React.ReactNode }[] = [
  {
    key: 'all',
    label: 'All photos',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
      </svg>
    ),
  },
  {
    key: 'mine',
    label: 'My Uploads',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
      </svg>
    ),
  },
  {
    key: 'recent',
    label: 'New Arrivals',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" />
      </svg>
    ),
  },
];

function SidebarContent({
  username, eventId, userCount, photos, filter, onFilterChange, onLeave, onClose,
}: Omit<Props, 'open'>) {
  const [now, setNow] = useState(() => Date.now());
  const myPhotos = photos.filter((p) => p.uploader === username).length;
  const newPhotos = photos.filter((p) => now - p.uploadedAt < 5 * 60 * 1000).length;
  const { faceBlurEnabled, setFaceBlurEnabled } = useGuestPreferences();

  const router = useRouter();

  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(interval);
  }, []);

  function handleNav(f: GalleryFilter) {
    onFilterChange(f);
    onClose?.();
  }

  function handleSettings() {
    onClose?.();
    router.push(`/event/${eventId}/settings`);
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto" style={{ color: 'rgba(255,255,255,.85)' }}>
      {/* Header */}
      <div className="flex items-center gap-3 px-5 pt-5 pb-4">
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center font-black text-white shrink-0"
          style={{ background: 'var(--neon-gradient)', fontFamily: 'var(--font-paytone)' }}
        >
          S
        </div>
        <div className="min-w-0">
          <p className="font-black text-white text-sm leading-tight" style={{ fontFamily: 'var(--font-paytone)' }}>
            Swarm
          </p>
          <p className="text-[11px]" style={{ color: 'rgba(255,255,255,.4)' }}>by K3DP Events</p>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="ml-auto w-7 h-7 rounded-full flex items-center justify-center"
            style={{ background: 'rgba(255,255,255,.1)' }}
          >
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Event info */}
      <div className="px-4 lg:px-5 pb-4" style={{ borderBottom: '1px solid rgba(255,255,255,.08)' }}>
        <div className="flex items-center gap-1.5 mb-1">
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--good)' }} />
          <span className="text-[11px] font-semibold" style={{ color: 'var(--good)' }}>Live Now</span>
        </div>
        <p className="text-white font-bold text-[15px]">Event Gallery</p>
        <div className="flex items-center gap-3 mt-1">
          <span className="text-[11px]" style={{ color: 'rgba(255,255,255,.4)' }}>📶 Offline</span>
          <span className="text-[11px]" style={{ color: 'rgba(255,255,255,.4)' }}>🔒 Secure</span>
        </div>
      </div>

      {/* Stats */}
      <div className="px-3.5 lg:px-4 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,.08)' }}>
        <p className="text-[10px] font-bold uppercase tracking-widest mb-3" style={{ color: 'rgba(255,255,255,.35)' }}>
          Gallery Stats
        </p>
        <div className="grid grid-cols-2 gap-2">
          <StatCard value={photos.length} label="Photos" />
          <StatCard value={userCount || '—'} label="Guests" />
          <StatCard value={myPhotos} label="Mine" />
          <StatCard value={newPhotos} label="New" highlight />
        </div>
      </div>

      {/* Browse nav */}
      <div className="px-2.5 lg:px-3 py-3" style={{ borderBottom: '1px solid rgba(255,255,255,.08)' }}>
        {NAV.map((item) => {
          const active = filter === item.key;
          return (
            <button
              key={item.key}
              onClick={() => handleNav(item.key)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors"
              style={active ? { background: 'rgba(139,92,255,.22)', color: 'var(--violet)' } : { color: 'rgba(255,255,255,.65)' }}
            >
              {item.icon}
              <span className="text-sm font-semibold">{item.label}</span>
              {active && (
                <span className="ml-auto w-1.5 h-1.5 rounded-full" style={{ background: 'var(--violet)' }} />
              )}
            </button>
          );
        })}
      </div>

      {/* Privacy */}
      <div className="px-4 lg:px-5 py-4 mt-auto" style={{ borderTop: '1px solid rgba(255,255,255,.08)' }}>
        <p className="text-[10px] font-bold uppercase tracking-widest mb-3" style={{ color: 'rgba(255,255,255,.35)' }}>
          My Privacy
        </p>
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4" style={{ color: 'rgba(255,255,255,.5)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
              </svg>
              <span className="text-sm" style={{ color: 'rgba(255,255,255,.65)' }}>Face blur</span>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={faceBlurEnabled}
              onClick={() => setFaceBlurEnabled(!faceBlurEnabled)}
              className="w-11 h-6 rounded-full relative transition-colors"
              style={{ background: faceBlurEnabled ? 'var(--violet)' : 'rgba(255,255,255,.18)' }}
            >
              <div
                className="absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all duration-200"
                style={{ left: faceBlurEnabled ? 'calc(100% - 22px)' : 2 }}
              />
            </button>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4" style={{ color: 'rgba(255,255,255,.5)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
              </svg>
              <span className="text-sm" style={{ color: 'rgba(255,255,255,.65)' }}>Auto-delete</span>
            </div>
            <span className="text-[11px] font-semibold" style={{ color: 'var(--violet)' }}>Event policy</span>
          </div>
        </div>

        {/* Settings + Leave */}
        <div className="mt-4 flex flex-col gap-2">
          <button
            onClick={handleSettings}
            className="w-full py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2"
            style={{ background: 'rgba(255,255,255,.07)', color: 'rgba(255,255,255,.75)' }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Settings
          </button>
          <button
            onClick={onLeave}
            className="w-full py-2.5 rounded-xl text-sm font-bold border flex items-center justify-center gap-2"
            style={{ borderColor: 'rgba(224,92,92,.4)', color: 'var(--danger)' }}
          >
            Leave Event
          </button>
        </div>
      </div>
    </div>
  );
}

export function Sidebar({ open, onClose, ...rest }: Props) {
  // Landscape: always visible fixed column (caller controls via CSS/layout)
  // Portrait: drawer overlay
  if (onClose !== undefined) {
    // Portrait drawer mode
    return (
      <>
        {/* Backdrop */}
        {open && (
          <div
            className="fixed inset-0 z-40"
            style={{ background: 'rgba(18,18,41,.4)' }}
            onClick={onClose}
          />
        )}
        {/* Drawer */}
        <div
          className="fixed top-0 left-0 bottom-0 z-50 transition-transform duration-300"
          style={{
            width: 'min(288px, 82vw)',
            background: 'var(--sidebar-bg)',
            transform: open ? 'translateX(0)' : 'translateX(-100%)',
          }}
        >
          <SidebarContent {...rest} onClose={onClose} />
        </div>
      </>
    );
  }

  // Landscape fixed column
  return (
    <div
      className="h-full overflow-hidden shrink-0"
      style={{
        background: 'var(--sidebar-bg)',
        width: 'clamp(188px, 24vw, 248px)',
      }}
    >
      <SidebarContent {...rest} />
    </div>
  );
}
