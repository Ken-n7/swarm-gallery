'use client';

import { JoinScreen } from '@/components/JoinScreen';
import { Gallery } from '@/components/Gallery';
import { UploadZone } from '@/components/UploadZone';
import { useUser } from '@/hooks/useUser';
import { useGallery } from '@/hooks/useGallery';

function GalleryView({ username, userId }: { username: string; userId: string }) {
  const { photos } = useGallery(userId);

  return (
    <div className="flex flex-col min-h-screen bg-zinc-50">
      <header className="flex items-center justify-between px-6 py-4 bg-white border-b border-zinc-100">
        <h1 className="text-lg font-semibold text-zinc-900">Swarm Gallery</h1>
        <span className="text-sm text-zinc-500">Hi, {username}</span>
      </header>

      <main className="flex-1 flex flex-col md:flex-row">
        <div className="flex-1 overflow-y-auto">
          <Gallery photos={photos} />
        </div>

        <aside className="md:w-72 p-4 border-t md:border-t-0 md:border-l border-zinc-100 bg-white">
          <p className="text-xs font-medium text-zinc-500 mb-3 uppercase tracking-wide">Add photo</p>
          <UploadZone username={username} />
          <p className="text-xs text-zinc-400 mt-4 text-center">
            {photos.length} photo{photos.length !== 1 ? 's' : ''} in gallery
          </p>
        </aside>
      </main>
    </div>
  );
}

export default function EventPage() {
  const { user, join, joining, error } = useUser();

  if (!user) return <JoinScreen onJoin={join} joining={joining} error={error} />;

  return <GalleryView username={user.username} userId={user.userId} />;
}
