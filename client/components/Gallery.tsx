'use client';

import Image from 'next/image';
import { useState, useMemo } from 'react';
import { Photo } from '@/types';
import { photoUrl } from '@/lib/api';
import { UserAvatar } from './UserAvatar';
import { PhotoViewer } from './PhotoViewer';
import { timeAgo } from '@/lib/time';

export type GalleryFilter = 'all' | 'recent' | 'mine' | 'liked';

interface Props {
  photos: Photo[];
  userCount: number;
  currentUser: string;
  currentUserId: string;
  currentUserAvatarUrl?: string | null;
  filter?: GalleryFilter;
  onFilterChange?: (f: GalleryFilter) => void;
  onOpenSidebar?: () => void;
  eventName?: string;
  hidePadBottom?: boolean;
}

interface PhotoGroup {
  uploader: string;
  avatarUrl: string | null;
  photos: Photo[];
  latestAt: number;
}

const GROUP_CARD_RATIO = '2/1';

function groupPhotos(photos: Photo[]): PhotoGroup[] {
  const map: Record<string, PhotoGroup> = {};
  for (const p of photos) {
    if (!map[p.uploader]) {
      map[p.uploader] = { uploader: p.uploader, avatarUrl: p.uploaderAvatarUrl ?? null, photos: [], latestAt: 0 };
    }
    map[p.uploader].photos.push(p);
    if (p.uploadedAt > map[p.uploader].latestAt) {
      map[p.uploader].latestAt = p.uploadedAt;
      // Keep the most recent photo's avatar (handles avatar updates mid-event)
      if (p.uploaderAvatarUrl) map[p.uploader].avatarUrl = p.uploaderAvatarUrl;
    }
  }
  return Object.values(map).sort((a, b) => b.latestAt - a.latestAt);
}

function MediaThumb({ photo }: { photo: Photo }) {
  if (photo.mimetype?.startsWith('video/')) {
    return (
      <>
        {photo.thumbUrl
          ? <Image src={photoUrl(photo.thumbUrl)} alt="" fill unoptimized sizes="(max-width: 768px) 100vw, 33vw" className="object-cover" />
          : <div className="w-full h-full" style={{ background: 'var(--ink)' }} />
        }
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: 'rgba(0,0,0,.45)', backdropFilter: 'blur(8px)' }}>
            <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
        </div>
      </>
    );
  }
  return <Image src={photoUrl(photo.url)} alt="" fill unoptimized sizes="(max-width: 768px) 100vw, 33vw" className="object-cover" />;
}

function GroupCard({
  group,
  onView,
}: {
  group: PhotoGroup;
  onView: (photos: Photo[], index: number) => void;
}) {
  const all = group.photos;
  const visible = all.slice(0, 5);
  const extra = all.length - 5;
  const [first, ...rest] = visible;
  const likeCount = group.photos.reduce((sum, photo) => sum + (photo.likeCount ?? 0), 0);

  if (!first) return null;

  if (all.length === 2) {
    return (
      <div className="flex flex-col">
        <div className="grid grid-cols-2 gap-[2px] overflow-hidden rounded-[14px]" style={{ aspectRatio: GROUP_CARD_RATIO }}>
          {all.map((photo, index) => (
            <button key={photo.id} onClick={() => onView(all, index)} className="relative overflow-hidden">
              <MediaThumb photo={photo} />
            </button>
          ))}
        </div>
        <FooterRow group={group} likeCount={likeCount} />
      </div>
    );
  }

  if (all.length === 3) {
    return (
      <div className="flex flex-col">
        <div
          className="grid overflow-hidden rounded-[14px]"
          style={{ gridTemplateColumns: '1.45fr 1fr', gridTemplateRows: '1fr 1fr', aspectRatio: GROUP_CARD_RATIO, gap: '2px' }}
        >
          <button onClick={() => onView(all, 0)} className="row-span-2 relative overflow-hidden">
            <MediaThumb photo={all[0]} />
          </button>
          {all.slice(1).map((photo, index) => (
            <button key={photo.id} onClick={() => onView(all, index + 1)} className="relative overflow-hidden">
              <MediaThumb photo={photo} />
            </button>
          ))}
        </div>
        <FooterRow group={group} likeCount={likeCount} />
      </div>
    );
  }

  if (all.length === 4) {
    return (
      <div className="flex flex-col">
        <div className="grid grid-cols-2 grid-rows-2 gap-[2px] overflow-hidden rounded-[14px]" style={{ aspectRatio: GROUP_CARD_RATIO }}>
          {all.map((photo, index) => (
            <button key={photo.id} onClick={() => onView(all, index)} className="relative overflow-hidden">
              <MediaThumb photo={photo} />
            </button>
          ))}
        </div>
        <FooterRow group={group} likeCount={likeCount} />
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      {/* Mosaic grid */}
      {all.length === 1 ? (
        <button
          onClick={() => onView(all, 0)}
          className="w-full overflow-hidden rounded-[14px] relative"
          style={{ aspectRatio: GROUP_CARD_RATIO }}
        >
          <MediaThumb photo={first} />
        </button>
      ) : (
        <div
          className="grid overflow-hidden rounded-[14px]"
          style={{
            gridTemplateColumns: '1.55fr 1fr 1fr',
            gridTemplateRows: '1fr 1fr',
            aspectRatio: GROUP_CARD_RATIO,
            gap: '2px',
          }}
          >
            {/* Hero — spans 2 rows */}
          <button onClick={() => onView(all, 0)} className="row-span-2 overflow-hidden relative">
            <MediaThumb photo={first} />
          </button>

          {/* 4 smaller cells */}
          {Array.from({ length: 4 }).map((_, i) => {
            const p = rest[i];
            return p ? (
              <button
                key={p.id}
                onClick={() => onView(all, i + 1)}
                className="overflow-hidden relative"
              >
                <MediaThumb photo={p} />
                {i === 3 && extra > 0 && (
                  <div
                    className="absolute inset-0 flex items-center justify-center text-white text-[10px] font-bold"
                    style={{ background: 'rgba(18,18,41,.55)' }}
                  >
                    +{extra}
                  </div>
                )}
              </button>
            ) : null;
          })}
        </div>
      )}

      <FooterRow group={group} likeCount={likeCount} />
    </div>
  );
}

function SinglePhotoTile({
  photo,
  allPhotos,
  onView,
}: {
  photo: Photo;
  allPhotos: Photo[];
  onView: (photos: Photo[], index: number) => void;
}) {
  const likeCount = photo.likeCount ?? 0;
  const viewIndex = allPhotos.findIndex((entry) => entry.id === photo.id);

  return (
    <button
      onClick={() => onView(allPhotos, Math.max(viewIndex, 0))}
      className="relative w-full overflow-hidden rounded-[6px] sm:rounded-[8px]"
      style={{ aspectRatio: '1 / 1' }}
    >
      <MediaThumb photo={photo} />
      {likeCount > 0 && (
        <div
          className="absolute right-1.5 bottom-1.5 inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-semibold shrink-0"
          style={{ background: 'rgba(18,18,41,.58)', color: 'white', backdropFilter: 'blur(10px)' }}
        >
          <span aria-hidden="true">♥</span>
          {likeCount}
        </div>
      )}
    </button>
  );
}

function LikedPhotoCard({
  photo,
  allPhotos,
  onView,
}: {
  photo: Photo;
  allPhotos: Photo[];
  onView: (photos: Photo[], index: number) => void;
}) {
  const likeCount = photo.likeCount ?? 0;
  const viewIndex = allPhotos.findIndex((entry) => entry.id === photo.id);

  return (
    <div className="flex flex-col">
      <button
        onClick={() => onView(allPhotos, Math.max(viewIndex, 0))}
        className="w-full overflow-hidden rounded-[14px] relative"
        style={{ aspectRatio: GROUP_CARD_RATIO }}
      >
        <MediaThumb photo={photo} />
      </button>

      <div className="flex items-center justify-between px-1 pt-2 pb-1">
        <div className="flex items-center gap-2 min-w-0">
          <UserAvatar username={photo.uploader} avatarUrl={photo.uploaderAvatarUrl} size="xs" />
          <div className="min-w-0 flex items-baseline gap-1 flex-wrap">
            <span className="text-[12px] font-bold text-[var(--ink)] truncate">
              {photo.uploader}
            </span>
            <span className="text-[10px] text-[var(--muted)]">
              {timeAgo(photo.uploadedAt)}
            </span>
          </div>
        </div>
        {likeCount > 0 && (
          <div
            className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-semibold shrink-0"
            style={{ background: 'rgba(244,114,182,.12)', color: '#be185d' }}
          >
            <span aria-hidden="true">♥</span>
            {likeCount}
          </div>
        )}
      </div>
    </div>
  );
}

function FooterRow({ group, likeCount }: { group: PhotoGroup; likeCount: number }) {
  return (
    <div className="flex items-center justify-between px-1 pt-2 pb-1">
      <div className="flex items-center gap-2 min-w-0">
        <UserAvatar username={group.uploader} avatarUrl={group.avatarUrl} size="xs" />
        <div className="min-w-0 flex items-baseline gap-1 flex-wrap">
          <span className="text-[12px] font-bold text-[var(--ink)] truncate">
            {group.uploader}
          </span>
          <span className="text-[10px] text-[var(--muted)]">
            {timeAgo(group.latestAt)}
          </span>
        </div>
      </div>
      {likeCount > 0 && (
        <div
          className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-semibold shrink-0"
          style={{ background: 'rgba(244,114,182,.12)', color: '#be185d' }}
        >
          <span aria-hidden="true">♥</span>
          {likeCount}
        </div>
      )}
    </div>
  );
}

const FILTERS: { key: GalleryFilter; label: string }[] = [
  { key: 'all',    label: 'All' },
  { key: 'recent', label: 'Recent' },
  { key: 'mine',   label: 'Mine' },
  { key: 'liked',  label: 'Top Liked' },
];

export function Gallery({
  photos,
  userCount,
  currentUser,
  currentUserId,
  currentUserAvatarUrl,
  filter: externalFilter,
  onFilterChange,
  onOpenSidebar,
  eventName = 'Event Gallery',
  hidePadBottom = false,
}: Props) {
  const [internalFilter, setInternalFilter] = useState<GalleryFilter>('all');
  const [viewer, setViewer] = useState<{ photos: Photo[]; index: number } | null>(null);

  const filter = externalFilter ?? internalFilter;
  function setFilter(f: GalleryFilter) {
    setInternalFilter(f);
    onFilterChange?.(f);
  }

  const filtered = useMemo(() => {
    if (filter === 'mine') return photos.filter((p) => p.uploader === currentUser);
    if (filter === 'recent') return [...photos].sort((a, b) => b.uploadedAt - a.uploadedAt).slice(0, 20);
    if (filter === 'liked') {
      return [...photos]
        .filter((p) => (p.likeCount ?? 0) > 0)
        .sort((a, b) => (b.likeCount ?? 0) - (a.likeCount ?? 0));
    }
    return photos;
  }, [photos, filter, currentUser]);

  const groups = useMemo(() => groupPhotos(filtered), [filtered]);
  const minePhotos = filter === 'mine' ? filtered : [];
  const likedPhotos = filter === 'liked' ? filtered : [];
  const emptyCopy = filter === 'mine'
    ? 'You have not uploaded anything yet. Add the first photo to start your own strip.'
    : filter === 'recent'
      ? 'No fresh uploads yet. New arrivals will show up here as guests share media.'
      : filter === 'liked'
        ? 'No liked photos yet. Hearts from guests will surface the favorites here.'
        : 'No photos yet. Be the first to share!';

  return (
    <>
      {/* Top bar */}
      <div className="flex items-center gap-3 px-4 pt-5 pb-3 border-b bg-white sticky top-0 z-10" style={{ borderColor: 'var(--line)' }}>
        {onOpenSidebar && (
          <button onClick={onOpenSidebar} aria-label="Open event sidebar" className="w-8 h-8 flex items-center justify-center shrink-0">
            <svg className="w-5 h-5 text-[var(--ink-soft)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        )}

        {/* Logo */}
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 font-black text-white text-sm"
          style={{ background: 'var(--neon-gradient)', fontFamily: 'var(--font-paytone)' }}
        >
          S
        </div>

        <h1
          className="flex-1 text-[var(--ink)] text-[17px] font-bold truncate"
          style={{ fontFamily: 'var(--font-paytone)' }}
        >
          {eventName}
        </h1>

        {userCount > 0 && (
          <div
            className="flex items-center gap-1.5 rounded-full px-2.5 py-1 shrink-0 text-xs font-semibold"
            style={{ background: 'var(--good-tint)', color: 'var(--good)' }}
          >
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--good)' }} />
            Live · {userCount}
          </div>
        )}

        <UserAvatar username={currentUser} avatarUrl={currentUserAvatarUrl} size="sm" />
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 px-4 py-3 overflow-x-auto bg-white">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className="shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors"
            style={
              filter === f.key
                ? { background: 'var(--ink)', color: '#fff', borderColor: 'var(--ink)' }
                : { background: 'transparent', color: 'var(--ink-soft)', borderColor: 'var(--line)' }
            }
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Groups grid */}
      {((filter === 'mine' && minePhotos.length === 0) || (filter === 'liked' && likedPhotos.length === 0) || ((filter !== 'mine' && filter !== 'liked') && groups.length === 0)) ? (
        <div className="flex flex-col items-center justify-center py-24 px-6 text-center">
          <div className="w-14 h-14 rounded-full flex items-center justify-center mb-4" style={{ background: 'var(--violet-tint)', color: 'var(--violet)' }}>
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
            </svg>
          </div>
          <p className="text-sm font-semibold text-[var(--ink)]">
            Nothing to show in {FILTERS.find((entry) => entry.key === filter)?.label.toLowerCase() || 'this view'}
          </p>
          <p className="text-sm mt-2 text-[var(--muted)] max-w-sm">
            {emptyCopy}
          </p>
        </div>
      ) : (
        <div
          className={hidePadBottom ? 'pt-1 pb-4' : 'pt-1 pb-24'}
          style={
            filter === 'mine'
              ? {
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(clamp(92px, 22vw, 138px), 1fr))',
                  gap: '3px',
                  alignItems: 'start',
                  paddingLeft: '14px',
                  paddingRight: '14px',
                }
              : filter === 'liked'
                ? {
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))',
                    gap: '10px',
                    alignItems: 'start',
                    paddingLeft: '14px',
                    paddingRight: '14px',
                  }
              : {
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))',
                  gap: '10px',
                  alignItems: 'start',
                  paddingLeft: '14px',
                  paddingRight: '14px',
                }
          }
        >
          {filter === 'mine'
            ? minePhotos.map((photo) => (
                <SinglePhotoTile
                  key={photo.id}
                  photo={photo}
                  allPhotos={minePhotos}
                  onView={(photos, index) => setViewer({ photos, index })}
                />
              ))
            : filter === 'liked'
              ? likedPhotos.map((photo) => (
                  <LikedPhotoCard
                    key={photo.id}
                    photo={photo}
                    allPhotos={likedPhotos}
                    onView={(photos, index) => setViewer({ photos, index })}
                  />
                ))
            : groups.map((group) => (
                <GroupCard
                  key={group.uploader}
                  group={group}
                  onView={(photos, index) => setViewer({ photos, index })}
                />
              ))}
        </div>
      )}

      {viewer && (
        <PhotoViewer
          photos={viewer.photos}
          startIndex={viewer.index}
          currentUser={currentUser}
          currentUserId={currentUserId}
          title={eventName}
          onClose={() => setViewer(null)}
        />
      )}
    </>
  );
}
