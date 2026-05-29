'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { JoinScreen } from '@/components/JoinScreen';
import { Gallery, GalleryFilter } from '@/components/Gallery';
import { BottomNav } from '@/components/BottomNav';
import { Sidebar } from '@/components/Sidebar';
import { UploadPanel } from '@/components/UploadPanel';
import { GuestBottomSheet } from '@/components/GuestBottomSheet';
import { GuestSettingsContent } from '@/components/GuestSettingsContent';
import { useUser } from '@/hooks/useUser';
import { useGallery } from '@/hooks/useGallery';
import { useOrientation } from '@/hooks/useOrientation';
import { SERVER } from '@/lib/api';

function GalleryView({
  username,
  userId,
  avatarUrl,
  eventId,
  eventName,
}: {
  username: string;
  userId: string;
  avatarUrl: string | null;
  eventId: string;
  eventName: string;
}) {
  const { photos, userCount } = useGallery(userId);
  const orientation = useOrientation();
  const router = useRouter();

  const [filter, setFilter] = useState<GalleryFilter>('all');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sheet, setSheet] = useState<'upload' | 'settings' | null>(null);
  const [viewportWidth, setViewportWidth] = useState(() => (typeof window === 'undefined' ? 0 : window.innerWidth));

  const { leave } = useUser();

  useEffect(() => {
    function updateWidth() {
      setViewportWidth(window.innerWidth);
    }
    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);

  function handleLeave() {
    leave();
    router.replace('/');
  }

  function openSheet(nextSheet: 'upload' | 'settings') {
    setSidebarOpen(false);
    setSheet(nextSheet);
  }

  const compactLandscape = orientation === 'landscape' && viewportWidth > 0 && viewportWidth < 1180;
  const activeSheet = orientation === 'portrait' ? sheet : null;

  if (orientation === 'landscape') {
    return (
      <div className="flex h-screen overflow-hidden">
        {/* Sidebar — fixed left */}
        <Sidebar
          username={username}
          eventId={eventId}
          eventName={eventName}
          userCount={userCount}
          photos={photos}
          filter={filter}
          onFilterChange={setFilter}
          onOpenSettings={() => router.push(`/event/${eventId}/settings`)}
          onLeave={handleLeave}
          compact={compactLandscape}
        />

        {/* Gallery — scrollable center */}
        <div className="flex-1 min-w-0 overflow-y-auto" style={{ background: 'var(--bg)' }}>
          <Gallery
            photos={photos}
            userCount={userCount}
            currentUser={username}
            currentUserId={userId}
            currentUserAvatarUrl={avatarUrl}
            filter={filter}
            onFilterChange={setFilter}
            eventName={eventName}
            hidePadBottom
          />
        </div>

        {/* Upload panel — fixed right */}
        <UploadPanel username={username} userId={userId} photos={photos} eventId={eventId} compact={compactLandscape} />
      </div>
    );
  }

  // Portrait layout
  return (
    <div className="flex flex-col min-h-screen overflow-y-auto" style={{ background: 'linear-gradient(160deg, var(--violet-tint) 0%, var(--bg-soft) 18%, var(--bg) 52%)' }}>
      {/* Portrait sidebar drawer */}
      <Sidebar
        username={username}
        eventId={eventId}
        eventName={eventName}
        userCount={userCount}
        photos={photos}
        filter={filter}
        onFilterChange={setFilter}
        onOpenSettings={() => setSheet('settings')}
        onLeave={handleLeave}
        open={orientation === 'portrait' && sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <Gallery
        photos={photos}
        userCount={userCount}
        currentUser={username}
        currentUserId={userId}
        currentUserAvatarUrl={avatarUrl}
        filter={filter}
        onFilterChange={setFilter}
        eventName={eventName}
        onOpenSidebar={() => setSidebarOpen(true)}
      />

      <BottomNav
        eventId={eventId}
        onUploadTap={() => openSheet('upload')}
        onSettingsTap={() => openSheet('settings')}
        activeOverride={activeSheet === 'upload' ? 'upload' : activeSheet === 'settings' ? 'settings' : 'gallery'}
      />

      <GuestBottomSheet
        open={activeSheet === 'upload'}
        title="Add Media"
        subtitle="Capture or choose files without leaving the gallery."
        onClose={() => setSheet(null)}
      >
        <UploadPanel
          username={username}
          userId={userId}
          photos={photos}
          eventId={eventId}
          sheetMode
        />
      </GuestBottomSheet>

      <GuestBottomSheet
        open={activeSheet === 'settings'}
        title="Settings"
        subtitle="Adjust privacy tools and event-level guest preferences."
        onClose={() => setSheet(null)}
      >
        <GuestSettingsContent eventId={eventId} layout="single" />
      </GuestBottomSheet>
    </div>
  );
}

export default function EventPage() {
  const params = useParams();
  const eventId = params.id as string;
  const { user, join, joining, checking, error } = useUser();
  const [eventName, setEventName] = useState<string>('');

  useEffect(() => {
    fetch(`${SERVER}/events/${encodeURIComponent(eventId)}`)
      .then((r) => r.ok ? r.json() : null)
      .then((data) => { if (data?.name) setEventName(data.name); })
      .catch(() => {});
  }, [eventId]);

  // Device check in flight — show nothing so join screen never flashes
  if (checking) return null;

  if (!user) {
    return <JoinScreen eventName={eventName || undefined} onJoin={join} joining={joining} error={error} />;
  }

  return <GalleryView username={user.username} userId={user.userId} avatarUrl={user.avatarUrl} eventId={eventId} eventName={eventName || 'Event Gallery'} />;
}
