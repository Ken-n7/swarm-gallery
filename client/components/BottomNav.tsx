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

      {/* Settings */}
      <button
        onClick={() => onSettingsTap ? onSettingsTap() : router.push(`/event/${eventId}/settings`)}
        className={`flex flex-col items-center justify-center gap-1 flex-1 ${isSettings ? active : inactive}`}
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={isSettings ? 2 : 1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        <span className="text-[10px] font-medium">Settings</span>
      </button>
    </nav>
  );
}
