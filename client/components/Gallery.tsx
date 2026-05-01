'use client';

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
  filter?: GalleryFilter;
  onFilterChange?: (f: GalleryFilter) => void;
  onOpenSidebar?: () => void;
  eventName?: string;
  hidePadBottom?: boolean;
}

interface PhotoGroup {
  uploader: string;
  photos: Photo[];
  latestAt: number;
}

function groupPhotos(photos: Photo[]): PhotoGroup[] {
  const map: Record<string, PhotoGroup> = {};
  for (const p of photos) {
    if (!map[p.uploader]) {
      map[p.uploader] = { uploader: p.uploader, photos: [], latestAt: 0 };
    }
    map[p.uploader].photos.push(p);
    if (p.uploadedAt > map[p.uploader].latestAt) {
      map[p.uploader].latestAt = p.uploadedAt;
    }
  }
  return Object.values(map).sort((a, b) => b.latestAt - a.latestAt);
}

function GroupCard({
  group,
  currentUser,
  onView,
}: {
  group: PhotoGroup;
  currentUser: string;
  onView: (photos: Photo[], index: number) => void;
}) {
  const [liked, setLiked] = useState(false);
  const all = group.photos;
  const visible = all.slice(0, 5);
  const extra = all.length - 5;
  const [first, ...rest] = visible;
  const likeCount = (group.photos[0]?.likeCount ?? 0) + (liked ? 1 : 0);

  if (!first) return null;

  return (
    <div className="flex flex-col">
      {/* Mosaic grid */}
      {all.length === 1 ? (
        <button
          onClick={() => onView(all, 0)}
          className="w-full overflow-hidden rounded-[14px]"
          style={{ aspectRatio: '1.4/1' }}
        >
          <img src={photoUrl(first.url)} alt="" className="w-full h-full object-cover" />
        </button>
      ) : (
        <div
          className="grid overflow-hidden rounded-[14px]"
          style={{
            gridTemplateColumns: '1.55fr 1fr 1fr',
            gridTemplateRows: '1fr 1fr',
            aspectRatio: '2.2/1',
            gap: '2px',
          }}
        >
          {/* Hero — spans 2 rows */}
          <button onClick={() => onView(all, 0)} className="row-span-2 overflow-hidden">
            <img src={photoUrl(first.url)} alt="" className="w-full h-full object-cover" />
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
                <img src={photoUrl(p.url)} alt="" className="w-full h-full object-cover" />
                {i === 3 && extra > 0 && (
                  <div
                    className="absolute inset-0 flex items-center justify-center text-white text-[10px] font-bold"
                    style={{ background: 'rgba(18,18,41,.55)' }}
                  >
                    +{extra}
                  </div>
                )}
              </button>
            ) : (
              <div key={`empty-${i}`} style={{ background: 'var(--line)' }} />
            );
          })}
        </div>
      )}

      {/* Footer row */}
      <div className="flex items-center justify-between px-1 pt-2 pb-1">
        <div className="flex items-center gap-2 min-w-0">
          <UserAvatar username={group.uploader} size="xs" />
          <div className="min-w-0 flex items-baseline gap-1 flex-wrap">
            <span className="text-[12px] font-bold text-[var(--ink)] truncate">
              {group.uploader}
            </span>
            <span className="text-[10px] text-[var(--muted)]">
              {timeAgo(group.latestAt)}
            </span>
            {likeCount > 0 && (
              <span className="text-[10px] text-[var(--muted)]">· {likeCount}♥</span>
            )}
          </div>
        </div>

        <div className="flex gap-1.5 shrink-0">
          <button
            onClick={() => setLiked(!liked)}
            className="w-[30px] h-[30px] rounded-full flex items-center justify-center transition-colors"
            style={{ background: liked ? 'var(--pink-tint)' : '#f5f5f8' }}
          >
            <svg
              className="w-3.5 h-3.5"
              fill={liked ? 'var(--pink)' : 'none'}
              stroke={liked ? 'var(--pink)' : 'var(--muted)'}
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
              />
            </svg>
          </button>
          <a
            href={photoUrl(first.url)}
            download
            className="w-[30px] h-[30px] rounded-full flex items-center justify-center"
            style={{ background: '#f5f5f8' }}
          >
            <svg className="w-3.5 h-3.5 text-[var(--muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
          </a>
        </div>
      </div>
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
    return photos;
  }, [photos, filter, currentUser]);

  const groups = useMemo(() => groupPhotos(filtered), [filtered]);

  return (
    <>
      {/* Top bar */}
      <div className="flex items-center gap-3 px-4 pt-5 pb-3 border-b bg-white sticky top-0 z-10" style={{ borderColor: 'var(--line)' }}>
        {onOpenSidebar && (
          <button onClick={onOpenSidebar} className="w-8 h-8 flex items-center justify-center shrink-0">
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

        <UserAvatar username={currentUser} size="sm" />
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
      {groups.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-[var(--muted)]">
          <p className="text-sm">No photos yet. Be the first to share!</p>
        </div>
      ) : (
        <div
          className={hidePadBottom ? 'px-3.5 pt-1 pb-4' : 'px-3.5 pt-1 pb-24'}
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))',
            gap: '10px',
            alignItems: 'start',
          }}
        >
          {groups.map((group) => (
            <GroupCard
              key={group.uploader}
              group={group}
              currentUser={currentUser}
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
          onClose={() => setViewer(null)}
        />
      )}
    </>
  );
}
