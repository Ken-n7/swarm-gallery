'use client';

import Image from 'next/image';
import { SERVER } from '@/lib/api';
import type { Photo } from '@/types';

export interface AdminStats {
  photoCount: number;
  guestCount: number;
  activeGuests: number;
  storageUsed: number;
}

export type GuestStatus = 'Active' | 'Idle' | 'Left event';

export interface AdminGuest {
  id: string;
  username: string;
  avatarUrl: string | null;
  joinedAt: number;
  lastSeen: number;
  photoCount: number;
  status?: GuestStatus;
}

export interface AdminPhoto extends Photo {
  sizeBytes?: number;
  flagged?: boolean;
}

function resolveMediaSrc(src: string | null | undefined) {
  if (!src) return '';
  return src.startsWith('http://') || src.startsWith('https://') ? src : `${SERVER}${src}`;
}

export function GuestAvatar({
  guest,
  size = 'sm',
}: {
  guest: Pick<AdminGuest, 'username' | 'avatarUrl'>;
  size?: 'xs' | 'sm' | 'md' | 'lg';
}) {
  const dim: Record<string, string> = {
    xs: 'w-6 h-6 text-[10px]',
    sm: 'w-[34px] h-[34px] text-[12px]',
    md: 'w-12 h-12 text-lg',
    lg: 'w-16 h-16 text-xl',
  };
  const px: Record<string, string> = { xs: '24px', sm: '34px', md: '48px', lg: '64px' };
  const cls = dim[size];

  if (guest.avatarUrl) {
    const src = guest.avatarUrl.startsWith('http') ? guest.avatarUrl : `${SERVER}${guest.avatarUrl}`;
    return (
      <div className={`${cls} rounded-full overflow-hidden relative shrink-0`}>
        <Image src={src} alt={guest.username} fill unoptimized sizes={px[size]} className="object-cover" />
      </div>
    );
  }
  return (
    <div
      className={`${cls} rounded-full flex items-center justify-center text-white font-bold shrink-0`}
      style={{ background: 'var(--neon-gradient)' }}
    >
      {guest.username.charAt(0).toUpperCase()}
    </div>
  );
}

export function AdminImage({
  src,
  alt,
  sizes,
}: {
  src: string | null | undefined;
  alt: string;
  sizes: string;
}) {
  const resolved = resolveMediaSrc(src);

  if (!resolved) return null;

  return (
    <Image
      src={resolved}
      alt={alt}
      fill
      unoptimized
      sizes={sizes}
      className="object-cover"
    />
  );
}

export function StatCard({
  title, value, icon, accent = 'var(--violet)',
}: {
  title: string;
  value: string | number;
  icon?: React.ReactNode;
  accent?: string;
}) {
  return (
    <div className="rounded-[14px] p-5 flex flex-col gap-3" style={{ background: 'var(--bg)', border: '1px solid var(--line)' }}>
      {icon && (
        <div
          className="w-9 h-9 rounded-[10px] flex items-center justify-center shrink-0"
          style={{ background: `color-mix(in srgb, ${accent} 14%, transparent)` }}
        >
          <span style={{ color: accent }}>{icon}</span>
        </div>
      )}
      <div>
        <div className="text-[10px] font-bold uppercase tracking-[0.08em] mb-1" style={{ color: 'var(--muted)' }}>{title}</div>
        <div key={String(value)} className="text-[28px] leading-none stat-pop" style={{ color: 'var(--ink)', fontFamily: 'var(--font-paytone)' }}>{value}</div>
      </div>
    </div>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const map = {
    Active: { color: 'var(--good)', bg: 'var(--good-tint)' },
    Idle: { color: '#b45309', bg: '#fef3c7' },
    'Left event': { color: 'var(--muted)', bg: 'var(--bg-deep)' },
  } as const;
  const style = map[status as keyof typeof map] || map.Active;
  return (
    <span
      className="text-[11px] font-semibold px-2.5 py-1 rounded-full"
      style={{ color: style.color, background: style.bg }}
    >
      {status}
    </span>
  );
}

export function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <circle cx="11" cy="11" r="7" />
      <path d="M20 20l-3.5-3.5" />
    </svg>
  );
}

export function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6L9 17l-5-5" />
    </svg>
  );
}

export function DestructiveNote({ children }: { children: string }) {
  return (
    <div
      className="inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.08em]"
      style={{ color: 'var(--danger)', background: 'var(--danger-tint)' }}
    >
      {children}
    </div>
  );
}

export function FormRow({ label, sub, children }: { label: string; sub?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 py-4 last:border-b-0" style={{ borderBottom: '1px solid var(--line)' }}>
      <div className="flex-1 md:pr-4">
        <div className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>{label}</div>
        {sub && <div className="text-xs mt-1" style={{ color: 'var(--muted)' }}>{sub}</div>}
      </div>
      <div className="flex-none w-full md:w-auto">{children}</div>
    </div>
  );
}
