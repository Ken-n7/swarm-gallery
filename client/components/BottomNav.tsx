'use client';

import { useRouter, usePathname } from 'next/navigation';

interface Props {
  eventId: string;
  onUploadTap?: () => void;
  onSettingsTap?: () => void;
  activeOverride?: 'gallery' | 'upload' | 'settings';
}

export function BottomNav({ eventId, onUploadTap, onSettingsTap, activeOverride }: Props) {
  const router = useRouter();
  const pathname = usePathname();

  const isGallery  = activeOverride ? activeOverride === 'gallery' : pathname === `/event/${eventId}`;
  const isUpload   = activeOverride ? activeOverride === 'upload' : pathname === `/event/${eventId}/upload`;
  const isSettings = activeOverride ? activeOverride === 'settings' : pathname === `/event/${eventId}/settings`;

  const active   = 'text-[var(--violet)]';
  const inactive = 'text-[var(--muted)]';

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 bg-white flex items-stretch justify-around z-20"
      style={{ height: 54, borderTop: '1px solid var(--line)' }}
    >
      {/* Gallery */}
      <button
        onClick={() => router.push(`/event/${eventId}`)}
        className={`flex flex-col items-center justify-center gap-1 flex-1 ${isGallery ? active : inactive}`}
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={isGallery ? 2 : 1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
        </svg>
        <span className="text-[10px] font-medium">Gallery</span>
      </button>

      {/* Upload */}
      <button
        onClick={() => onUploadTap ? onUploadTap() : router.push(`/event/${eventId}/upload`)}
        className={`flex flex-col items-center justify-center gap-1 flex-1 ${isUpload ? active : inactive}`}
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={isUpload ? 2 : 1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
        </svg>
        <span className="text-[10px] font-medium">Upload</span>
      </button>

      {/* Profile */}
      <button
        onClick={() => onSettingsTap ? onSettingsTap() : router.push(`/event/${eventId}/settings`)}
        className={`flex flex-col items-center justify-center gap-1 flex-1 ${isSettings ? active : inactive}`}
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={isSettings ? 2 : 1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
        </svg>
        <span className="text-[10px] font-medium">Profile</span>
      </button>
    </nav>
  );
}
