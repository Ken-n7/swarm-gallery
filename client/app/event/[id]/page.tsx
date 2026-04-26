'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { JoinScreen } from '@/components/JoinScreen';
import { Gallery, GalleryFilter } from '@/components/Gallery';
import { BottomNav } from '@/components/BottomNav';
import { Sidebar } from '@/components/Sidebar';
import { UploadPanel } from '@/components/UploadPanel';
import { useUser } from '@/hooks/useUser';
import { useGallery } from '@/hooks/useGallery';
import { useOrientation } from '@/hooks/useOrientation';

function GalleryView({
  username,
  userId,
  eventId,
}: {
  username: string;
  userId: string;
  eventId: string;
}) {
  const { photos, userCount } = useGallery(userId);
  const orientation = useOrientation();
  const router = useRouter();

  const [filter, setFilter] = useState<GalleryFilter>('all');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const { leave } = useUser();

  function handleLeave() {
    leave();
    router.replace('/');
  }

  if (orientation === 'landscape') {
    return (
      <div className="flex h-screen overflow-hidden">
        {/* Sidebar — fixed left */}
        <Sidebar
          username={username}
          eventId={eventId}
          userCount={userCount}
          photos={photos}
          filter={filter}
          onFilterChange={setFilter}
          onLeave={handleLeave}
        />

        {/* Gallery — scrollable center */}
        <div className="flex-1 overflow-y-auto bg-white">
          <Gallery
            photos={photos}
            userCount={userCount}
            currentUser={username}
            filter={filter}
            onFilterChange={setFilter}
            hidePadBottom
          />
        </div>

        {/* Upload panel — fixed right */}
        <UploadPanel username={username} photos={photos} />
      </div>
    );
  }

  // Portrait layout
  return (
    <div className="flex flex-col min-h-screen bg-white overflow-y-auto">
      {/* Portrait sidebar drawer */}
      <Sidebar
        username={username}
        eventId={eventId}
        userCount={userCount}
        photos={photos}
        filter={filter}
        onFilterChange={setFilter}
        onLeave={handleLeave}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <Gallery
        photos={photos}
        userCount={userCount}
        currentUser={username}
        filter={filter}
        onFilterChange={setFilter}
        onOpenSidebar={() => setSidebarOpen(true)}
      />

      <BottomNav eventId={eventId} username={username} />
    </div>
  );
}

export default function EventPage() {
  const params = useParams();
  const eventId = params.id as string;
  const { user, join, joining, error } = useUser();

  if (!user) {
    return <JoinScreen onJoin={join} joining={joining} error={error} />;
  }

  return <GalleryView username={user.username} userId={user.userId} eventId={eventId} />;
}
