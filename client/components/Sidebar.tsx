'use client';

import { useEffect, useState } from 'react';
import { Photo } from '@/types';
import { GalleryFilter } from './Gallery';

interface Props {
  username: string;
  eventId: string;
  userCount: number;
  photos: Photo[];
  filter: GalleryFilter;
  onFilterChange: (f: GalleryFilter) => void;
  onOpenSettings?: () => void;
  onLeave: () => void;
  compact?: boolean;
  open?: boolean;
  onClose?: () => void;
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

function StatPill({ value, label }: { value: string | number; label: string }) {
  return (
    <div className="flex flex-col items-center px-3 py-2 rounded-xl flex-1" style={{ background: 'rgba(255,255,255,.06)' }}>
      <span className="text-[17px] font-black leading-none" style={{ color: '#c4b5fd' }}>{value}</span>
      <span className="text-[10px] mt-0.5 font-medium" style={{ color: 'rgba(255,255,255,.38)' }}>{label}</span>
    </div>
  );
}

function SidebarContent({
  username, userCount, photos, filter, onFilterChange, onOpenSettings, onLeave, onClose, compact = false,
}: Omit<Props, 'open'>) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(id);
  }, []);

  const myPhotos = photos.filter((p) => p.uploader === username).length;
  const newPhotos = photos.filter((p) => now - p.uploadedAt < 5 * 60 * 1000).length;

  function handleNav(f: GalleryFilter) {
    onFilterChange(f);
    onClose?.();
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto">

      {/* Header */}
      <div
        className={`flex items-center gap-3 ${compact ? 'px-3.5 pt-5 pb-4' : 'px-5 pt-6 pb-5'}`}
        style={{
          background: 'linear-gradient(160deg, rgba(124,58,237,.35) 0%, transparent 70%)',
          borderBottom: '1px solid rgba(255,255,255,.07)',
        }}
      >
        <img
          src="/logo-512.png"
          alt="Swarm Gallery"
          className="w-10 h-10 rounded-full object-cover shrink-0"
          style={{ boxShadow: '0 0 0 2px rgba(124,58,237,.4), 0 4px 12px rgba(0,0,0,.3)' }}
        />
        <div className="min-w-0">
          <p className="font-black text-white text-sm leading-tight" style={{ fontFamily: 'var(--font-paytone)' }}>
            Swarm
          </p>
          {!compact && (
            <p className="text-[11px]" style={{ color: 'rgba(255,255,255,.45)' }}>by K3DP Events</p>
          )}
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

      {/* Event info + Stats */}
      <div
        className={`${compact ? 'px-3.5 py-3' : 'px-4 py-4'}`}
        style={{ borderBottom: '1px solid rgba(255,255,255,.07)' }}
      >
        <div className="flex items-center gap-1.5 mb-2">
          <span
            className="w-2 h-2 rounded-full"
            style={{ background: '#22c55e', boxShadow: '0 0 6px #22c55e' }}
          />
          <span className="text-[11px] font-bold tracking-wide" style={{ color: '#4ade80' }}>LIVE</span>
        </div>
        <p className="text-white font-bold text-[14px] leading-tight mb-3">Event Gallery</p>
        <div className="flex gap-2">
          <StatPill value={photos.length} label="Photos" />
          <StatPill value={userCount || '—'} label="Guests" />
          <StatPill value={myPhotos} label="Mine" />
          {!compact && <StatPill value={newPhotos > 0 ? `+${newPhotos}` : '—'} label="New" />}
        </div>
      </div>

      {/* Nav */}
      <div className={`${compact ? 'px-2 py-2' : 'px-2.5 py-3'} flex-1`}>
        {NAV.map((item) => {
          const active = filter === item.key;
          return (
            <button
              key={item.key}
              onClick={() => handleNav(item.key)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all relative overflow-hidden"
              style={
                active
                  ? { background: 'rgba(124,58,237,.28)', color: '#c4b5fd' }
                  : { color: 'rgba(255,255,255,.55)' }
              }
            >
              {/* Left accent bar */}
              {active && (
                <span
                  className="absolute left-0 top-2 bottom-2 rounded-full"
                  style={{ width: 3, background: 'var(--neon-gradient)' }}
                />
              )}
              {item.icon}
              <span className={`${compact ? 'text-[13px]' : 'text-sm'} font-semibold`}>
                {compact ? item.label.replace(' Uploads', '').replace(' Arrivals', '') : item.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Footer */}
      <div
        className={`${compact ? 'px-3.5 py-3.5' : 'px-4 py-4'} flex flex-col gap-2`}
        style={{ borderTop: '1px solid rgba(255,255,255,.07)' }}
      >
        {onOpenSettings && (
          <button
            onClick={() => { onOpenSettings(); onClose?.(); }}
            className="w-full py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all"
            style={{
              background: 'linear-gradient(135deg, rgba(124,58,237,.3), rgba(255,61,163,.18))',
              color: '#e9d5ff',
              border: '1px solid rgba(124,58,237,.3)',
            }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
            </svg>
            My Profile
          </button>
        )}
        <button
          onClick={onLeave}
          className="w-full py-2 text-[12px] font-medium"
          style={{ color: 'rgba(255,255,255,.25)' }}
        >
          Leave event
        </button>
      </div>
    </div>
  );
}

export function Sidebar({ open, onClose, ...rest }: Props) {
  const sidebarBg = 'linear-gradient(180deg, #1a0f3a 0%, #120d2a 40%, #0f0d1f 100%)';

  if (onClose !== undefined) {
    return (
      <>
        {open && (
          <div
            className="fixed inset-0 z-40"
            style={{ background: 'rgba(10,8,30,.55)', backdropFilter: 'blur(2px)' }}
            onClick={onClose}
          />
        )}
        <div
          className="fixed top-0 left-0 bottom-0 z-50 transition-transform duration-300"
          style={{
            width: 'min(288px, 82vw)',
            background: sidebarBg,
            transform: open ? 'translateX(0)' : 'translateX(-100%)',
          }}
        >
          <SidebarContent {...rest} onClose={onClose} compact={false} />
        </div>
      </>
    );
  }

  return (
    <div
      className="h-full overflow-hidden shrink-0"
      style={{
        background: sidebarBg,
        width: rest.compact ? 'clamp(152px, 18vw, 188px)' : 'clamp(188px, 24vw, 248px)',
      }}
    >
      <SidebarContent {...rest} />
    </div>
  );
}
