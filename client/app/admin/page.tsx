'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import { SERVER, checkAdmin, getAdminStats, getRecentPhotos, getRecentGuests, getAllPhotos, getAllGuests } from '@/lib/api';
import { AdminLayout } from '@/components/Admin/AdminLayout';
import { AdminLoginForm } from '@/components/Admin/AdminLoginForm';
import type { Photo } from '@/types';

interface AdminStats {
  photoCount: number;
  guestCount: number;
  activeGuests: number;
  storageUsed: number;
}

interface AdminGuest {
  id: string;
  username: string;
  avatarUrl: string | null;
  joinedAt: number;
  lastSeen: number;
  photoCount: number;
  status?: GuestStatus;
}

type GuestStatus = 'Active' | 'Idle' | 'Left event';

interface AdminPhoto extends Photo {
  sizeBytes?: number;
  flagged?: boolean;
}

function resolveMediaSrc(src: string | null | undefined) {
  if (!src) return '';
  return src.startsWith('http://') || src.startsWith('https://') ? src : `${SERVER}${src}`;
}

function AdminImage({
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

export default function AdminPage() {
  const [stats, setStats] = useState<AdminStats | null>(null);

  useEffect(() => {
    getAdminStats().then(setStats).catch(() => {});
  }, []);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState('dashboard');

  useEffect(() => {
    checkAdmin()
      .then((res) => setIsAuthenticated(res.admin))
      .catch(() => setIsAuthenticated(false))
      .finally(() => setLoading(false));
  }, []);

  const handleLogin = () => {
    setIsAuthenticated(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-soft)' }}>
        <div style={{ color: 'var(--ink-soft)' }}>Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <AdminLoginForm onLogin={handleLogin} />;
  }

  const getPageTitle = (page: string) => {
    switch (page) {
      case 'dashboard': return 'Dashboard';
      case 'galleries': return 'Galleries';
      case 'guests': return 'Guests';
      case 'settings': return 'Settings';
      default: return 'Settings';
    }
  };

  const getPageSubtitle = (page: string) => {
    switch (page) {
      case 'dashboard': return 'Overview of your event';
      case 'galleries': return 'Manage event photos';
      case 'guests': return 'View and manage guests';
      case 'settings': return 'Manage event handoff, privacy, and temporary storage';
      default: return 'Configure event settings';
    }
  };

  const renderContent = () => {
    switch (currentPage) {
      case 'dashboard':
        return <DashboardContent />;
      case 'galleries':
        return <GalleriesContent />;
      case 'guests':
        return <GuestsContent />;
      case 'settings':
        return <SettingsContent />;
      default:
        return <DashboardContent />;
    }
  };

  return (
    <AdminLayout
      currentPage={currentPage}
      onPageChange={setCurrentPage}
      title={getPageTitle(currentPage)}
      subtitle={getPageSubtitle(currentPage)}
      activeGuests={stats?.activeGuests || 0}
    >
      {renderContent()}
    </AdminLayout>
  );
}

function StatCard({ title, value }: { title: string; value: string | number }) {
  return (
    <div className="bg-white rounded-[14px] p-6" style={{ border: '1px solid var(--line)' }}>
      <div className="text-[10px] font-bold uppercase tracking-[0.08em] mb-2" style={{ color: 'var(--muted)' }}>{title}</div>
      <div className="text-2xl" style={{ color: 'var(--ink)', fontFamily: 'var(--font-paytone)' }}>{value}</div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
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

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <circle cx="11" cy="11" r="7" />
      <path d="M20 20l-3.5-3.5" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6L9 17l-5-5" />
    </svg>
  );
}

function DestructiveNote({ children }: { children: string }) {
  return (
    <div
      className="inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.08em]"
      style={{ color: 'var(--danger)', background: 'var(--danger-tint)' }}
    >
      {children}
    </div>
  );
}

function DashboardContent() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [recentPhotos, setRecentPhotos] = useState<AdminPhoto[]>([]);
  const [recentGuests, setRecentGuests] = useState<AdminGuest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      getAdminStats(),
      getRecentPhotos('demo', 6),
      getRecentGuests('demo', 5)
    ]).then(([statsData, photosData, guestsData]) => {
      setStats(statsData);
      setRecentPhotos(photosData);
      setRecentGuests(guestsData);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="p-6 text-center" style={{ color: 'var(--muted)' }}>Loading dashboard...</div>;
  }

  const guestStatuses: GuestStatus[] = ['Active', 'Active', 'Active', 'Active', 'Idle'];
  const topUploader = [...recentGuests].sort((a, b) => (b.photoCount || 0) - (a.photoCount || 0))[0];

  return (
    <div className="p-6 space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Photos" value={stats?.photoCount || 0} />
        <StatCard title="Total Guests" value={stats?.guestCount || 0} />
        <StatCard title="Active Guests" value={stats?.activeGuests || 0} />
        <StatCard title="Temp Storage" value={`${stats?.storageUsed || 0} MB`} />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 gap-6">
        {/* Upload Timeline Chart */}
        <div className="bg-white rounded-[14px] p-6" style={{ border: '1px solid var(--line)' }}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-[17px] font-semibold" style={{ color: 'var(--ink)' }}>Photo uploads over time</h3>
              <div className="text-sm" style={{ color: 'var(--muted)' }}>Today · May 5, 2026</div>
            </div>
            <div className="px-3 py-1 text-xs font-medium rounded-full" style={{ background: 'var(--violet-tint)', color: 'var(--violet-dark)' }}>
              Peak: 2–3 PM
            </div>
          </div>
          <UploadTimelineChart />
        </div>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Photos */}
        <div className="bg-white rounded-[14px] p-6" style={{ border: '1px solid var(--line)' }}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[17px] font-semibold" style={{ color: 'var(--ink)' }}>Recent Photos</h3>
            <button className="text-sm" style={{ color: 'var(--violet)' }}>View all →</button>
          </div>
          {recentPhotos.length > 0 ? (
            <div className="grid grid-cols-3 gap-3">
              {recentPhotos.map((photo) => (
                <div key={photo.id} className="relative aspect-square rounded-[12px] overflow-hidden" style={{ background: 'var(--bg-deep)' }}>
                  <AdminImage src={photo.thumbUrl || photo.url} alt={`${photo.uploader} photo`} sizes="(max-width: 1024px) 33vw, 180px" />
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8" style={{ color: 'var(--muted)' }}>
              No photos uploaded yet
            </div>
          )}
        </div>

        {/* Recent Guests */}
        <div className="bg-white rounded-[14px] overflow-hidden" style={{ border: '1px solid var(--line)' }}>
          <div className="px-[18px] py-[14px] flex items-center justify-between" style={{ borderBottom: '1px solid var(--line)' }}>
            <h3 className="text-[17px] font-semibold" style={{ color: 'var(--ink)' }}>Recent Guests</h3>
            <button className="text-sm" style={{ color: 'var(--violet)' }}>View all →</button>
          </div>
          {recentGuests.length > 0 ? (
            <>
              <div className="hidden xl:grid grid-cols-[1.9fr_1fr_.8fr_.9fr_.6fr] px-[18px] py-[9px]" style={{ background: 'var(--bg-deep)' }}>
                {['Guest', 'Joined', 'Photos', 'Status', ''].map((label) => (
                  <div
                    key={label}
                    className="text-[10px] font-bold uppercase tracking-[0.08em]"
                    style={{ color: 'var(--muted)' }}
                  >
                    {label}
                  </div>
                ))}
              </div>
              {recentGuests.map((guest, index) => {
                const status = guestStatuses[index % guestStatuses.length];
                return (
                  <div key={guest.id} style={{ borderTop: '1px solid var(--line)' }}>
                    <div className="hidden xl:grid grid-cols-[1.9fr_1fr_.8fr_.9fr_.6fr] px-[18px] py-[11px] items-center">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ background: 'var(--neon-gradient)' }}>
                          {guest.username.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="text-[13px] font-semibold truncate" style={{ color: 'var(--ink)' }}>{guest.username}</div>
                          <div className="text-[11px]" style={{ color: 'var(--muted)' }}>
                            {index + 2}m ago
                          </div>
                        </div>
                      </div>
                      <div className="text-[12px]" style={{ color: 'var(--muted)' }}>
                        {new Date(guest.joinedAt).toLocaleDateString()}
                      </div>
                      <div className="text-[13px] font-semibold" style={{ color: 'var(--ink)' }}>{guest.photoCount}</div>
                      <div><StatusBadge status={status} /></div>
                      <div>
                        <button className="text-[12px] font-semibold" style={{ color: 'var(--violet)' }}>View →</button>
                      </div>
                    </div>

                    <div className="xl:hidden px-[18px] py-4 space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ background: 'var(--neon-gradient)' }}>
                            {guest.username.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <div className="text-[13px] font-semibold truncate" style={{ color: 'var(--ink)' }}>{guest.username}</div>
                            <div className="text-[11px]" style={{ color: 'var(--muted)' }}>{index + 2}m ago</div>
                          </div>
                        </div>
                        <StatusBadge status={status} />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <div className="text-[10px] font-bold uppercase tracking-[0.08em]" style={{ color: 'var(--muted)' }}>Joined</div>
                          <div className="text-[12px]" style={{ color: 'var(--ink)' }}>{new Date(guest.joinedAt).toLocaleDateString()}</div>
                        </div>
                        <div>
                          <div className="text-[10px] font-bold uppercase tracking-[0.08em]" style={{ color: 'var(--muted)' }}>Photos</div>
                          <div className="text-[12px] font-semibold" style={{ color: 'var(--ink)' }}>{guest.photoCount}</div>
                        </div>
                      </div>
                      <button className="text-[12px] font-semibold" style={{ color: 'var(--violet)' }}>View →</button>
                    </div>
                  </div>
                );
              })}
              {topUploader && (
                <div className="px-[18px] py-3 flex flex-wrap items-center gap-3" style={{ borderTop: '1px solid var(--line)', background: 'var(--violet-tint)' }}>
                  <div className="text-[12px] font-bold" style={{ color: 'var(--violet-dark)' }}>
                    Top uploader: <span style={{ color: 'var(--violet)' }}>{topUploader.username}</span>
                  </div>
                  <div className="text-[12px]" style={{ color: 'var(--muted)' }}>
                    {topUploader.photoCount} photos
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-8" style={{ color: 'var(--muted)' }}>
              No guests have joined yet
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function GalleriesContent() {
  const [photos, setPhotos] = useState<AdminPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedPhotos, setSelectedPhotos] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('All photos');
  const [focusedPhotoId, setFocusedPhotoId] = useState<string | null>(null);
  const [galleryNotice, setGalleryNotice] = useState<{ tone: 'success' | 'warning'; message: string } | null>(null);
  const [confirmAction, setConfirmAction] = useState<{ type: 'deleteSelected' | 'deleteSingle'; photoId?: string } | null>(null);
  const [actionState, setActionState] = useState<Record<'export' | 'downloadAll' | 'deleteSelected', 'idle' | 'running' | 'success'>>({
    export: 'idle',
    downloadAll: 'idle',
    deleteSelected: 'idle',
  });

  useEffect(() => {
    getAllPhotos().then((data) => {
      setPhotos(data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const enrichedPhotos = photos.map((photo, index) => ({
    ...photo,
    flagged: typeof photo.flagged === 'boolean' ? photo.flagged : index % 7 === 0,
  }));

  const filteredPhotos = enrichedPhotos.filter((photo) => {
    const matchesQuery = !query || `${photo.filename} ${photo.uploader}`.toLowerCase().includes(query.toLowerCase());
    const matchesFilter =
      filter === 'All photos' ? true :
      filter === 'By guest' ? !!photo.uploader :
      filter === 'Flagged' ? !!photo.flagged :
      true;
    return matchesQuery && matchesFilter;
  });

  const selectedVisibleCount = filteredPhotos.filter((photo) => selectedPhotos.has(photo.id)).length;
  const focusedPhoto = focusedPhotoId ? enrichedPhotos.find((photo) => photo.id === focusedPhotoId) || null : null;
  const flaggedPhotos = enrichedPhotos.filter((photo) => photo.flagged);

  const toggleSelection = (photoId: string) => {
    const newSelected = new Set(selectedPhotos);
    if (newSelected.has(photoId)) {
      newSelected.delete(photoId);
    } else {
      newSelected.add(photoId);
    }
    setSelectedPhotos(newSelected);
  };

  const selectAll = () => {
    if (selectedVisibleCount === filteredPhotos.length) {
      const next = new Set(selectedPhotos);
      filteredPhotos.forEach((photo) => next.delete(photo.id));
      setSelectedPhotos(next);
    } else {
      const next = new Set(selectedPhotos);
      filteredPhotos.forEach((photo) => next.add(photo.id));
      setSelectedPhotos(next);
    }
  };

  const setBulkActionState = (
    action: 'export' | 'downloadAll' | 'deleteSelected',
    next: 'idle' | 'running' | 'success'
  ) => setActionState((current) => ({ ...current, [action]: next }));

  const runBulkAction = (action: 'export' | 'downloadAll' | 'deleteSelected') => {
    setBulkActionState(action, 'running');
    setConfirmAction(null);

    window.setTimeout(() => {
      if (action === 'export') {
        setGalleryNotice({
          tone: 'success',
          message: `${selectedVisibleCount || selectedPhotos.size} photo${(selectedVisibleCount || selectedPhotos.size) === 1 ? '' : 's'} prepared for export. Backend ZIP generation can attach here next.`,
        });
      }
      if (action === 'downloadAll') {
        setGalleryNotice({
          tone: 'success',
          message: `Download prepared for ${filteredPhotos.length} visible photo${filteredPhotos.length === 1 ? '' : 's'}.`,
        });
      }
      if (action === 'deleteSelected') {
        const selectedIds = new Set(selectedPhotos);
        setPhotos((current) => current.filter((photo) => !selectedIds.has(photo.id)));
        setSelectedPhotos(new Set());
        setFocusedPhotoId((current) => (current && selectedIds.has(current) ? null : current));
        setGalleryNotice({
          tone: 'warning',
          message: `${selectedIds.size} selected photo${selectedIds.size === 1 ? '' : 's'} removed from the client-side gallery state.`,
        });
      }
      setBulkActionState(action, 'success');
    }, 650);
  };

  const handleDeleteSingle = (photoId: string) => {
    setConfirmAction(null);
    window.setTimeout(() => {
      setPhotos((current) => current.filter((photo) => photo.id !== photoId));
      setSelectedPhotos((current) => {
        const next = new Set(current);
        next.delete(photoId);
        return next;
      });
      setFocusedPhotoId((current) => (current === photoId ? null : current));
      setGalleryNotice({ tone: 'warning', message: 'Photo removed from the client-side gallery state.' });
    }, 300);
  };

  if (loading) {
    return <div className="p-6 text-center" style={{ color: 'var(--muted)' }}>Loading photos...</div>;
  }

  return (
    <div className="p-6">
      {galleryNotice && (
        <div
          className="rounded-[14px] px-4 py-3 mb-4 flex flex-wrap items-center justify-between gap-3"
          style={{
            border: `1px solid ${galleryNotice.tone === 'success' ? 'rgba(31,143,74,.15)' : 'rgba(224,92,92,.2)'}`,
            background: galleryNotice.tone === 'success' ? 'var(--good-tint)' : 'var(--danger-tint)',
            color: galleryNotice.tone === 'success' ? 'var(--good)' : 'var(--danger)',
          }}
        >
          <div className="text-sm font-medium">{galleryNotice.message}</div>
          <button className="text-xs font-semibold" onClick={() => setGalleryNotice(null)}>
            Dismiss
          </button>
        </div>
      )}

      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div
          className="flex items-center gap-2 px-4 py-2 rounded-full min-w-[220px] flex-1 bg-white"
          style={{ border: '1px solid var(--line)' }}
        >
          <span style={{ color: 'var(--muted)' }}><SearchIcon /></span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search photos or guests..."
            className="flex-1 bg-transparent outline-none text-[13px]"
            style={{ color: 'var(--ink)' }}
          />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {['All photos', 'By guest', 'Flagged'].map((label) => (
            <button
              key={label}
              onClick={() => setFilter(label)}
              className="px-3 py-1.5 rounded-full text-[12px] font-medium bg-white"
              style={{
                border: `1px solid ${filter === label ? 'var(--ink)' : 'var(--line)'}`,
                color: filter === label ? '#fff' : 'var(--ink-soft)',
                background: filter === label ? 'var(--ink)' : '#fff',
              }}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1 rounded-[12px] p-1 bg-white" style={{ border: '1px solid var(--line)' }}>
          <button
            onClick={() => setViewMode('grid')}
            aria-label="Grid view"
            className="p-2 rounded-[10px]"
            style={viewMode === 'grid' ? { background: 'var(--violet-tint)', color: 'var(--violet-dark)' } : { color: 'var(--muted)', background: 'transparent' }}
          >
            ⊞
          </button>
          <button
            onClick={() => setViewMode('list')}
            aria-label="List view"
            className="p-2 rounded-[10px]"
            style={viewMode === 'list' ? { background: 'var(--violet-tint)', color: 'var(--violet-dark)' } : { color: 'var(--muted)', background: 'transparent' }}
          >
            ☰
          </button>
        </div>
      </div>

      {selectedPhotos.size > 0 && (
        <div
          className="rounded-[10px] px-4 py-2.5 mb-4 flex flex-wrap items-center gap-3"
          style={{ background: 'var(--violet-tint)', border: '1px solid rgba(139,92,255,.2)' }}
        >
          <span className="text-[13px] font-semibold" style={{ color: 'var(--violet-dark)' }}>
            {selectedVisibleCount} visible selected
          </span>
          <button
            onClick={() => runBulkAction('export')}
            disabled={selectedVisibleCount === 0 || actionState.export === 'running'}
            className="px-3.5 py-1.5 rounded-[8px] text-[12px] font-semibold disabled:opacity-50"
            style={{ color: 'var(--violet)', background: 'var(--violet-tint)', border: '1px solid rgba(139,92,255,.25)' }}
          >
            {actionState.export === 'running' ? 'Preparing...' : actionState.export === 'success' ? 'Export Ready' : 'Export ZIP'}
          </button>
          <button
            onClick={() => setConfirmAction({ type: 'deleteSelected' })}
            disabled={selectedVisibleCount === 0 || actionState.deleteSelected === 'running'}
            className="px-3.5 py-1.5 rounded-[8px] text-[12px] font-semibold disabled:opacity-50"
            style={{ color: 'var(--danger)', background: 'var(--danger-tint)', border: '1px solid rgba(224,92,92,.2)' }}
          >
            {actionState.deleteSelected === 'running' ? 'Deleting...' : 'Delete'}
          </button>
          {confirmAction?.type === 'deleteSelected' && (
            <div className="w-full rounded-[10px] border p-3 flex flex-wrap items-center gap-3" style={{ borderColor: 'rgba(224,92,92,.2)', background: 'rgba(253,231,236,.72)' }}>
              <div className="text-[12px] font-medium" style={{ color: 'var(--danger)' }}>
                Delete {selectedVisibleCount} visible selected photo{selectedVisibleCount === 1 ? '' : 's'} from the client-side gallery?
              </div>
              <button
                onClick={() => runBulkAction('deleteSelected')}
                className="px-3 py-1.5 rounded-[8px] text-[12px] font-semibold text-white"
                style={{ background: 'var(--danger)' }}
              >
                Confirm Delete
              </button>
              <button onClick={() => setConfirmAction(null)} className="text-[12px] font-semibold" style={{ color: 'var(--muted)' }}>
                Cancel
              </button>
            </div>
          )}
          <DestructiveNote>Deletes only visible selection</DestructiveNote>
          <button onClick={() => setSelectedPhotos(new Set())} className="text-[12px] lg:ml-auto" style={{ color: 'var(--muted)' }}>
            Clear
          </button>
        </div>
      )}

      {focusedPhoto && (
        <div className="bg-white rounded-[14px] p-4 mb-4" style={{ border: '1px solid var(--line)' }}>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-[0.08em] mb-2" style={{ color: 'var(--muted)' }}>Review Queue</div>
              <div className="text-[16px] font-semibold" style={{ color: 'var(--ink)' }}>{focusedPhoto.uploader || 'Guest upload'}</div>
              <div className="text-[12px] mt-1" style={{ color: 'var(--muted)' }}>
                {focusedPhoto.filename} • {new Date(focusedPhoto.uploadedAt).toLocaleString()}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {focusedPhoto.flagged ? <DestructiveNote>Flagged for moderation</DestructiveNote> : null}
              <button
                onClick={() => setFocusedPhotoId(null)}
                className="px-3 py-1.5 rounded-[8px] text-[12px] font-semibold"
                style={{ border: '1px solid var(--line)', color: 'var(--ink-soft)' }}
              >
                Close Review
              </button>
            </div>
          </div>
        </div>
      )}

      {filteredPhotos.length > 0 ? (
        viewMode === 'grid' ? (
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 2xl:grid-cols-6 gap-3">
            {filteredPhotos.map((photo) => (
              <div
                key={photo.id}
                className="relative aspect-square rounded-[14px] overflow-hidden border-2 cursor-pointer"
                style={{
                  background: 'var(--bg-deep)',
                  borderColor: selectedPhotos.has(photo.id) ? 'var(--violet)' : focusedPhotoId === photo.id ? 'var(--ink)' : 'transparent',
                }}
                onClick={() => toggleSelection(photo.id)}
              >
                <AdminImage src={photo.thumbUrl || photo.url} alt={`${photo.uploader || 'Guest'} photo`} sizes="(max-width: 768px) 50vw, (max-width: 1280px) 33vw, 240px" />
                <div className="absolute top-2 left-2 w-[18px] h-[18px] rounded-full grid place-items-center" style={{ background: selectedPhotos.has(photo.id) ? 'var(--violet)' : 'rgba(255,255,255,.72)', border: selectedPhotos.has(photo.id) ? '2px solid var(--violet)' : '2px solid rgba(0,0,0,.15)' }}>
                  {selectedPhotos.has(photo.id) && <span className="text-white"><CheckIcon /></span>}
                </div>
                {photo.flagged && (
                  <div className="absolute top-2 right-2">
                    <DestructiveNote>Flagged</DestructiveNote>
                  </div>
                )}
                <div className="absolute inset-x-0 bottom-0 px-2.5 py-2" style={{ background: 'linear-gradient(to top, rgba(18,18,41,.82), transparent)' }}>
                  <div className="text-[11px] font-semibold truncate text-white">{photo.uploader || 'Guest'}</div>
                  <div className="text-[10px] truncate" style={{ color: 'rgba(255,255,255,.75)' }}>
                    {new Date(photo.uploadedAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                  </div>
                  <div className="mt-2 flex gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setFocusedPhotoId(photo.id);
                      }}
                      className="px-2 py-1 rounded-[7px] text-[10px] font-semibold"
                      style={{ background: 'rgba(255,255,255,.92)', color: 'var(--ink)' }}
                    >
                      Review
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-[14px] overflow-hidden" style={{ border: '1px solid var(--line)' }}>
            <div className="hidden xl:grid grid-cols-[.4fr_.9fr_1.5fr_.9fr_1fr] px-[14px] py-[9px]" style={{ background: 'var(--bg-deep)' }}>
              {['', 'Photo', 'Guest', 'Time', 'Actions'].map((label) => (
                <div key={label} className="text-[10px] font-bold uppercase tracking-[0.08em]" style={{ color: 'var(--muted)' }}>{label}</div>
              ))}
            </div>
            <div className="flex items-center gap-3 p-3 rounded-[14px]" style={{ background: 'var(--bg-soft)', border: '1px solid var(--line)' }}>
              <input
                type="checkbox"
                checked={filteredPhotos.length > 0 && selectedVisibleCount === filteredPhotos.length}
                onChange={selectAll}
                className="rounded border-slate-300"
              />
              <span className="text-sm font-medium" style={{ color: 'var(--ink-soft)' }}>Select All Visible</span>
            </div>
            {filteredPhotos.map((photo) => (
              <div key={photo.id} style={{ borderTop: '1px solid var(--line)', background: selectedPhotos.has(photo.id) ? 'var(--violet-tint)' : '#fff' }}>
                <div className="hidden xl:grid grid-cols-[.4fr_.9fr_1.5fr_.9fr_1fr] px-[14px] py-[10px] items-center">
                  <div>
                    <input
                      type="checkbox"
                      checked={selectedPhotos.has(photo.id)}
                      onChange={() => toggleSelection(photo.id)}
                      className="rounded border-slate-300"
                    />
                  </div>
                  <div className="relative w-11 h-11 rounded-[8px] overflow-hidden" style={{ background: 'var(--bg-deep)' }}>
                    <AdminImage src={photo.thumbUrl || photo.url} alt={`${photo.uploader || 'Guest'} thumbnail`} sizes="44px" />
                  </div>
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold text-white" style={{ background: 'var(--neon-gradient)' }}>
                      {(photo.uploader || 'G').charAt(0).toUpperCase()}
                    </div>
                    <span className="text-[13px] font-semibold truncate" style={{ color: 'var(--ink)' }}>{photo.uploader || 'Guest'}</span>
                    {photo.flagged ? <DestructiveNote>Flagged</DestructiveNote> : null}
                  </div>
                  <div className="text-[12px]" style={{ color: 'var(--muted)' }}>{new Date(photo.uploadedAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</div>
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => setFocusedPhotoId(photo.id)}
                      className="px-2.5 py-1 rounded-[7px] text-[11px]"
                      style={{ border: '1px solid var(--line)', color: 'var(--ink-soft)' }}
                    >
                      View
                    </button>
                    <button
                      onClick={() => setConfirmAction({ type: 'deleteSingle', photoId: photo.id })}
                      className="px-2.5 py-1 rounded-[7px] text-[11px] font-semibold"
                      style={{ background: 'var(--danger-tint)', color: 'var(--danger)' }}
                    >
                      Delete
                    </button>
                  </div>
                </div>

                <div className="xl:hidden p-4 space-y-3">
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={selectedPhotos.has(photo.id)}
                      onChange={() => toggleSelection(photo.id)}
                      className="mt-3 rounded border-slate-300"
                    />
                    <div className="relative w-14 h-14 rounded-[10px] overflow-hidden flex-none" style={{ background: 'var(--bg-deep)' }}>
                      <AdminImage src={photo.thumbUrl || photo.url} alt={`${photo.uploader || 'Guest'} thumbnail`} sizes="56px" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-[13px] font-semibold truncate" style={{ color: 'var(--ink)' }}>{photo.uploader || 'Guest'}</div>
                      <div className="text-[12px]" style={{ color: 'var(--muted)' }}>
                        Uploaded {new Date(photo.uploadedAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                      </div>
                      {photo.flagged ? <div className="mt-2"><DestructiveNote>Flagged for review</DestructiveNote></div> : null}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => setFocusedPhotoId(photo.id)}
                      className="px-2.5 py-1 rounded-[7px] text-[11px]"
                      style={{ border: '1px solid var(--line)', color: 'var(--ink-soft)' }}
                    >
                      View
                    </button>
                    <button
                      onClick={() => setConfirmAction({ type: 'deleteSingle', photoId: photo.id })}
                      className="px-2.5 py-1 rounded-[7px] text-[11px] font-semibold"
                      style={{ background: 'var(--danger-tint)', color: 'var(--danger)' }}
                    >
                      Delete
                    </button>
                  </div>
                  {confirmAction?.type === 'deleteSingle' && confirmAction.photoId === photo.id && (
                    <div className="rounded-[10px] border p-3 flex flex-wrap items-center gap-3" style={{ borderColor: 'rgba(224,92,92,.2)', background: 'rgba(253,231,236,.72)' }}>
                      <div className="text-[12px] font-medium" style={{ color: 'var(--danger)' }}>
                        Remove this photo from the client-side gallery state?
                      </div>
                      <button
                        onClick={() => handleDeleteSingle(photo.id)}
                        className="px-3 py-1.5 rounded-[8px] text-[12px] font-semibold text-white"
                        style={{ background: 'var(--danger)' }}
                      >
                        Confirm Delete
                      </button>
                      <button onClick={() => setConfirmAction(null)} className="text-[12px] font-semibold" style={{ color: 'var(--muted)' }}>
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        <div className="text-center py-12">
          <div className="w-16 h-16 rounded-[18px] mx-auto mb-4 flex items-center justify-center" style={{ background: 'var(--violet-tint)', border: '1px solid var(--line)' }}>
            <svg viewBox="0 0 24 24" className="w-7 h-7" fill="none" stroke="var(--violet)" strokeWidth="1.8">
              <path d="M4 8h4l1.5-2h5L16 8h4v10H4z" />
              <circle cx="12" cy="13" r="3.2" />
            </svg>
          </div>
          <div style={{ color: 'var(--muted)' }}>
            {filter === 'Flagged' ? 'No flagged photos need review right now' : 'No photos uploaded yet'}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mt-[18px]">
        <div className="bg-white rounded-[14px] p-[14px] px-4" style={{ border: '1px solid var(--line)' }}>
          <div className="text-[10px] font-bold uppercase tracking-[0.1em] mb-3" style={{ color: 'var(--muted)' }}>Live Stats</div>
          {[
            ['Total photos', String(filteredPhotos.length)],
            ['This hour', String(Math.min(filteredPhotos.length, 12))],
            ['Avg / guest', filteredPhotos.length ? (filteredPhotos.length / Math.max(new Set(filteredPhotos.map((p) => p.uploader)).size, 1)).toFixed(1) : '0'],
            ['Total size', `${(filteredPhotos.reduce((sum, p) => sum + (p.sizeBytes || 0), 0) / 1024 / 1024 / 1024).toFixed(1)} GB`],
            ['Flagged', String(filteredPhotos.filter((p) => p.flagged).length)],
          ].map(([label, value]) => (
            <div key={label} className="flex justify-between mb-2.5 last:mb-0">
              <span className="text-[12px]" style={{ color: 'var(--ink-soft)' }}>{label}</span>
              <span className="text-[12px] font-bold" style={{ color: 'var(--ink)' }}>{value}</span>
            </div>
          ))}
        </div>
        <div className="bg-white rounded-[14px] p-[14px] px-4" style={{ border: '1px solid var(--line)' }}>
          <div className="flex items-center justify-between gap-3 mb-3">
            <div className="text-[10px] font-bold uppercase tracking-[0.1em]" style={{ color: 'var(--muted)' }}>Bulk Actions</div>
            <div className="text-[11px]" style={{ color: 'var(--muted)' }}>{flaggedPhotos.length} in moderation queue</div>
          </div>
          <div className="flex flex-col gap-2">
            <button
              onClick={() => runBulkAction('export')}
              disabled={selectedVisibleCount === 0 || actionState.export === 'running'}
              className="w-full px-3 py-2 rounded-[9px] text-[12px] font-semibold text-left disabled:opacity-50"
              style={{ color: 'var(--violet)', background: 'var(--violet-tint)' }}
            >
              {actionState.export === 'running' ? 'Preparing selected export...' : 'Export selected (ZIP)'}
            </button>
            <button
              onClick={() => runBulkAction('downloadAll')}
              disabled={filteredPhotos.length === 0 || actionState.downloadAll === 'running'}
              className="w-full px-3 py-2 rounded-[9px] text-[12px] font-semibold text-left disabled:opacity-50"
              style={{ color: 'var(--ink)', background: 'var(--bg-deep)' }}
            >
              {actionState.downloadAll === 'running' ? 'Preparing download...' : 'Download all visible media'}
            </button>
            <button
              onClick={() => setConfirmAction({ type: 'deleteSelected' })}
              disabled={selectedVisibleCount === 0 || actionState.deleteSelected === 'running'}
              className="w-full px-3 py-2 rounded-[9px] text-[12px] font-semibold text-left disabled:opacity-50"
              style={{ color: 'var(--danger)', background: 'var(--danger-tint)' }}
            >
              {actionState.deleteSelected === 'running' ? 'Deleting selected...' : 'Delete selected'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function GuestsContent() {
  const [guests, setGuests] = useState<AdminGuest[]>([]);
  const [selectedGuest, setSelectedGuest] = useState<AdminGuest | null>(null);
  const [guestPhotos, setGuestPhotos] = useState<AdminPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('All guests');
  const [query, setQuery] = useState('');

  useEffect(() => {
    Promise.all([getAllGuests(), getAllPhotos()])
      .then(([guestData, photoData]) => {
        setGuests(guestData);
        setGuestPhotos(photoData);
        if (guestData.length > 0) setSelectedGuest(guestData[0]);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="p-6 text-center" style={{ color: 'var(--muted)' }}>Loading guests...</div>;
  }

  const guestStatuses: GuestStatus[] = ['Active', 'Active', 'Idle', 'Left event'];
  const enrichedGuests = guests.map((guest, index) => ({
    ...guest,
    status: guestStatuses[index % guestStatuses.length],
  }));
  const filters = ['All guests', 'Active', 'Idle', 'Left event'];
  const filteredGuests = enrichedGuests.filter((guest) => {
    const matchesFilter = filter === 'All guests' ? true : guest.status === filter;
    const matchesQuery = !query || guest.username.toLowerCase().includes(query.toLowerCase());
    return matchesFilter && matchesQuery;
  });
  const selected = selectedGuest ? enrichedGuests.find((g) => g.id === selectedGuest.id) || null : null;
  const selectedGuestPhotos = selected
    ? guestPhotos.filter((photo) => photo.uploader === selected.username).slice(0, 6)
    : [];
  const totalGuests = Math.max(enrichedGuests.length, 1);

  return (
    <div className="p-4 lg:p-6">
      <div className="grid grid-cols-1 xl:grid-cols-[300px_minmax(0,1fr)_220px] gap-4 items-start">
      <div className="bg-white rounded-[16px] flex flex-col min-h-[520px]" style={{ border: '1px solid var(--line)' }}>
        <div className="p-3.5 flex-none" style={{ borderBottom: '1px solid var(--line)' }}>
          <div className="flex items-center gap-2 px-3 py-2 rounded-[9px]" style={{ background: 'var(--bg-deep)' }}>
            <span style={{ color: 'var(--muted)' }}><SearchIcon /></span>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search guests"
              className="flex-1 bg-transparent outline-none text-[13px]"
              style={{ color: 'var(--ink)' }}
            />
          </div>
        </div>
        <div className="p-2.5 flex-none flex gap-1 flex-wrap" style={{ borderBottom: '1px solid var(--line)' }}>
          {filters.map((label) => (
            <button
              key={label}
              onClick={() => setFilter(label)}
              className="px-2.5 py-1 rounded-full text-[11px] font-semibold"
              style={{
                background: filter === label ? 'var(--ink)' : 'transparent',
                color: filter === label ? '#fff' : 'var(--muted)',
                outline: filter === label ? 'none' : '1px solid var(--line)',
              }}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="flex-1 overflow-auto">
          {filteredGuests.map((guest) => (
            <div
              key={guest.id}
              className="flex items-center gap-3 px-3.5 py-3 cursor-pointer"
              style={{
                borderBottom: '1px solid var(--line)',
                background: selected?.id === guest.id ? 'var(--violet-tint)' : 'transparent',
              }}
              onClick={() => setSelectedGuest(guest)}
            >
              <div className="w-[34px] h-[34px] rounded-full flex items-center justify-center text-white font-bold text-[12px]" style={{ background: 'var(--neon-gradient)' }}>
                {guest.username.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-semibold truncate" style={{ color: 'var(--ink)' }}>{guest.username}</div>
                <div className="text-[11px]" style={{ color: 'var(--muted)' }}>{guest.photoCount} photos</div>
              </div>
              <StatusBadge status={guest.status} />
            </div>
          ))}
          {filteredGuests.length === 0 && (
            <div className="h-full grid place-items-center text-[14px]" style={{ color: 'var(--muted)' }}>
              No guests found
            </div>
          )}
        </div>
        <div className="p-3.5 flex-none" style={{ borderTop: '1px solid var(--line)' }}>
          <div className="text-[10px] font-bold uppercase tracking-[0.1em] mb-3" style={{ color: 'var(--muted)' }}>Bulk Actions</div>
          <div className="flex flex-col gap-1.5">
            {['Export guest list', 'Remove selected'].map((label) => (
              <button
                key={label}
                className="px-3 py-2 rounded-[9px] text-[12px] text-left font-medium"
                style={{
                  border: '1px solid var(--line)',
                  color: label === 'Remove selected' ? 'var(--danger)' : 'var(--ink-soft)',
                  background: label === 'Remove selected' ? 'var(--danger-tint)' : '#fff'
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-[16px] overflow-hidden" style={{ background: 'var(--bg-deep)', border: '1px solid var(--line)' }}>
        {selected ? (
          <div className="p-5 flex flex-col gap-3">
            <div className="bg-white rounded-[14px] p-5 flex flex-wrap items-center gap-4" style={{ border: '1px solid var(--line)' }}>
              <div className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg" style={{ background: 'var(--neon-gradient)' }}>
                {selected.username.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1">
                <div className="text-[18px] font-bold" style={{ color: 'var(--ink)' }}>{selected.username}</div>
                <StatusBadge status={selected.status} />
              </div>
              <div className="text-right">
                <div className="text-[22px] font-bold" style={{ color: 'var(--violet)' }}>{selected.photoCount}</div>
                <div className="text-[11px]" style={{ color: 'var(--muted)' }}>photos</div>
              </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
              <div className="bg-white rounded-[14px] p-5" style={{ border: '1px solid var(--line)' }}>
                <div className="text-[10px] font-bold uppercase tracking-[0.1em] mb-3" style={{ color: 'var(--muted)' }}>Details</div>
                {[
                  ['Joined', new Date(selected.joinedAt).toLocaleString()],
                  ['Last seen', new Date(selected.lastSeen).toLocaleString()],
                  ['Photos uploaded', String(selected.photoCount)],
                ].map(([label, value]) => (
                  <div key={label} className="flex justify-between mb-2.5 last:mb-0">
                    <span className="text-[12px]" style={{ color: 'var(--muted)' }}>{label}</span>
                    <span className="text-[12px] font-semibold" style={{ color: 'var(--ink)' }}>{value}</span>
                  </div>
                ))}
              </div>

              <div className="bg-white rounded-[14px] p-5" style={{ border: '1px solid var(--line)' }}>
                <div className="text-[10px] font-bold uppercase tracking-[0.1em] mb-3" style={{ color: 'var(--muted)' }}>Recent Photos</div>
                <div className="grid grid-cols-3 gap-[5px]">
                  {Array.from({ length: Math.min(6, Math.max(selected.photoCount, 1)) }).map((_, index) => {
                    const photoKey = `photo-${index}`;
                    return (
                      <div key={photoKey} className="aspect-square rounded-[8px] overflow-hidden" style={{ background: 'var(--bg-deep)' }}>
                        {selectedGuestPhotos[index]?.thumbUrl || selectedGuestPhotos[index]?.url ? (
                          <AdminImage
                            src={selectedGuestPhotos[index].thumbUrl || selectedGuestPhotos[index].url}
                            alt={`${selected.username} photo ${index + 1}`}
                            sizes="(max-width: 1280px) 33vw, 120px"
                          />
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="bg-white rounded-[14px] p-5" style={{ border: '1px solid var(--line)' }}>
              <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                <div className="text-[10px] font-bold uppercase tracking-[0.1em]" style={{ color: 'var(--muted)' }}>Admin Controls</div>
                <DestructiveNote>Review before removal</DestructiveNote>
              </div>
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-2">
                {[
                  ['View all photos', 'var(--violet)', 'var(--violet-tint)'],
                  ['Download their album', 'var(--ink)', 'var(--bg-deep)'],
                  ['Remove photos', 'var(--danger)', 'var(--danger-tint)'],
                ].map(([label, color, bg]) => (
                  <button key={label} className="px-3.5 py-2.5 rounded-[10px] text-[13px] font-semibold text-left" style={{ color, background: bg }}>
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="h-full grid place-items-center text-[14px]" style={{ color: 'var(--muted)' }}>
            Select a guest to view profile
          </div>
        )}
      </div>

      <div className="bg-white rounded-[16px] px-4 py-4 xl:min-h-[520px]" style={{ border: '1px solid var(--line)' }}>
        <div className="flex items-center justify-between gap-3 mb-3">
          <div className="text-[10px] font-bold uppercase tracking-[0.1em]" style={{ color: 'var(--muted)' }}>Live Stats</div>
          <div className="text-[11px]" style={{ color: 'var(--muted)' }}>Guest overview</div>
        </div>
        {[
          ['Total joined', String(enrichedGuests.length)],
          ['Active now', String(enrichedGuests.filter((g) => g.status === 'Active').length)],
          ['Avg photos', (enrichedGuests.reduce((sum, g) => sum + g.photoCount, 0) / totalGuests).toFixed(1)],
          ['Left event', String(enrichedGuests.filter((g) => g.status === 'Left event').length)],
        ].map(([label, value]) => (
          <div key={label} className="mb-3">
            <div className="text-[20px] font-bold" style={{ color: 'var(--ink)' }}>{value}</div>
            <div className="text-[11px]" style={{ color: 'var(--muted)' }}>{label}</div>
          </div>
        ))}
      </div>
      </div>
    </div>
  );
}

function SettingsContent() {
  const [eventName, setEventName] = useState('Demo Event');
  const [organizerName, setOrganizerName] = useState('Swarm Gallery');
  const [eventDate, setEventDate] = useState('2026-05-05');
  const [eventType, setEventType] = useState('Corporate / Conference');
  const [expectedGuests, setExpectedGuests] = useState('300');
  const [retentionPolicy, setRetentionPolicy] = useState('Until handoff');
  const [storageWarning, setStorageWarning] = useState('80');
  const [hasChanges, setHasChanges] = useState(false);
  const [storageUsed, setStorageUsed] = useState(4.5);
  const [storageTotal] = useState(50);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [notice, setNotice] = useState<{ tone: 'success' | 'warning'; message: string } | null>(null);
  const [confirmAction, setConfirmAction] = useState<'clearCache' | 'deleteMedia' | 'deleteEvent' | null>(null);
  const [workflow, setWorkflow] = useState({
    handoffPrepared: false,
    handoffCompleted: false,
    mediaDeleted: false,
    eventClosed: false,
  });
  const [actionState, setActionState] = useState<Record<'exportPackage' | 'markComplete' | 'clearCache' | 'deleteMedia' | 'deleteEvent', 'idle' | 'running' | 'success'>>({
    exportPackage: 'idle',
    markComplete: 'idle',
    clearCache: 'idle',
    deleteMedia: 'idle',
    deleteEvent: 'idle',
  });
  const storagePercent = (storageUsed / storageTotal) * 100;
  const qrUrl = `${SERVER}/events/demo/qr`;
  const joinUrl = typeof window === 'undefined' ? '' : `${window.location.origin}/event/demo`;

  const setActionProgress = (
    action: 'exportPackage' | 'markComplete' | 'clearCache' | 'deleteMedia' | 'deleteEvent',
    next: 'idle' | 'running' | 'success'
  ) => {
    setActionState((current) => ({ ...current, [action]: next }));
  };

  const handleSave = () => {
    setSaveState('saving');
    setNotice(null);
    window.setTimeout(() => {
      console.log('Saving event info:', {
        eventName,
        organizerName,
        eventDate,
        eventType,
        expectedGuests,
        retentionPolicy,
        storageWarning,
      });
      setHasChanges(false);
      setSaveState('saved');
      setNotice({ tone: 'success', message: 'Settings saved locally. Backend wiring can use this client-side contract next.' });
    }, 500);
  };

  const handleDiscard = () => {
    setEventName('Demo Event');
    setOrganizerName('Swarm Gallery');
    setEventDate('2026-05-05');
    setEventType('Corporate / Conference');
    setExpectedGuests('300');
    setRetentionPolicy('Until handoff');
    setStorageWarning('80');
    setHasChanges(false);
    setSaveState('idle');
    setNotice({ tone: 'warning', message: 'Unsaved settings were discarded.' });
  };

  const runAction = (
    action: 'exportPackage' | 'markComplete' | 'clearCache' | 'deleteMedia' | 'deleteEvent'
  ) => {
    setActionProgress(action, 'running');
    setConfirmAction(null);

    window.setTimeout(() => {
      if (action === 'exportPackage') {
        setWorkflow((current) => ({ ...current, handoffPrepared: true }));
        setNotice({ tone: 'success', message: 'Client handoff package prepared. You can now mark handoff complete once delivery is done.' });
      }
      if (action === 'markComplete') {
        setWorkflow((current) => ({ ...current, handoffCompleted: true }));
        setNotice({ tone: 'success', message: 'Handoff marked complete. Media deletion is now unlocked.' });
      }
      if (action === 'clearCache') {
        setStorageUsed((current) => Math.max(1.2, Number((current - 0.6).toFixed(1))));
        setNotice({ tone: 'success', message: 'Temporary cache cleared. Event media remains intact until handoff cleanup.' });
      }
      if (action === 'deleteMedia') {
        setWorkflow((current) => ({ ...current, mediaDeleted: true }));
        setStorageUsed(0.3);
        setNotice({ tone: 'success', message: 'Event media marked as deleted. You may now delete the event record.' });
      }
      if (action === 'deleteEvent') {
        setWorkflow((current) => ({ ...current, eventClosed: true }));
        setNotice({ tone: 'success', message: 'Event record marked for closeout. This client-side flow is ready for backend wiring.' });
      }

      setActionProgress(action, 'success');
    }, 700);
  };

  const canMarkComplete = workflow.handoffPrepared;
  const canDeleteMedia = workflow.handoffCompleted;
  const canDeleteEvent = workflow.mediaDeleted;

  return (
    <div className="flex-1 flex flex-col">
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-2xl space-y-6">
          {notice && (
            <div
              className="rounded-xl p-4 flex flex-wrap items-center justify-between gap-3"
              style={{
                border: `1px solid ${notice.tone === 'success' ? 'rgba(31,143,74,.15)' : 'rgba(224,92,92,.2)'}`,
                background: notice.tone === 'success' ? 'var(--good-tint)' : 'var(--danger-tint)',
                color: notice.tone === 'success' ? 'var(--good)' : 'var(--danger)',
              }}
            >
              <div className="text-sm font-medium">{notice.message}</div>
              <button className="text-xs font-semibold" onClick={() => setNotice(null)}>
                Dismiss
              </button>
            </div>
          )}

          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="p-6 border-b border-slate-200">
              <h3 className="text-lg font-semibold text-slate-900">Event Info</h3>
              <p className="text-sm text-slate-600 mt-1">Basic details about your current event session.</p>
            </div>

            <div className="p-6 space-y-6">
              <FormRow label="Event name" sub="Displayed to guests when they join the gallery.">
                <input
                  type="text"
                  value={eventName}
                  onChange={(e) => { setEventName(e.target.value); setHasChanges(true); }}
                  className="w-full md:w-60 px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                />
              </FormRow>

              <FormRow label="Organizer name" sub="Shown on the join screen as the host.">
                <input
                  type="text"
                  value={organizerName}
                  onChange={(e) => { setOrganizerName(e.target.value); setHasChanges(true); }}
                  className="w-full md:w-60 px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                />
              </FormRow>

              <FormRow label="Event date" sub="For display and record-keeping.">
                <input
                  type="date"
                  value={eventDate}
                  onChange={(e) => { setEventDate(e.target.value); setHasChanges(true); }}
                  className="w-full md:w-40 px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                />
              </FormRow>

              <FormRow label="Event type" sub="Displayed to guests when they join.">
                <select
                  value={eventType}
                  onChange={(e) => { setEventType(e.target.value); setHasChanges(true); }}
                  className="w-full md:w-60 px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent bg-white"
                >
                  <option>Corporate / Conference</option>
                  <option>Wedding</option>
                  <option>Birthday</option>
                  <option>Other</option>
                </select>
              </FormRow>

              <FormRow label="Expected guest count" sub="Used to prepare event staffing and device setup.">
                <input
                  type="number"
                  value={expectedGuests}
                  onChange={(e) => { setExpectedGuests(e.target.value); setHasChanges(true); }}
                  className="w-full md:w-24 px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                />
              </FormRow>

              <FormRow label="Guest privacy tool" sub="Guests may optionally blur faces on their own device before uploading. This is guest-controlled, not an admin moderation setting.">
                <span className="px-3 py-2 rounded-full text-xs font-semibold" style={{ background: 'var(--violet-tint)', color: 'var(--violet-dark)' }}>
                  Optional face blur
                </span>
              </FormRow>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Access & QR</h3>
            <p className="text-slate-600 mb-6">
              Share this QR code with attendees so they can join the gallery on their phones and contribute media for this event only.
            </p>

            <div className="flex justify-center mb-6">
              <div className="relative p-4 bg-white border border-slate-200 rounded-xl shadow-sm w-56 h-56">
                <Image
                  src={qrUrl}
                  alt="Event QR code"
                  fill
                  unoptimized
                  sizes="224px"
                  className="object-contain p-4"
                />
              </div>
            </div>

            <div className="bg-slate-50 rounded-lg p-4">
              <p className="text-sm text-slate-500 mb-2">Join link</p>
              <a
                href={joinUrl || '#'}
                target="_blank"
                rel="noreferrer"
                className="text-slate-900 font-medium break-all"
              >
                {joinUrl || 'Loading…'}
              </a>
            </div>

            <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-slate-900">Access status</div>
                  <div className="text-xs text-slate-500 mt-1">QR and join link are live for the current event session.</div>
                </div>
                <span className="px-3 py-1 rounded-full text-xs font-semibold" style={{ background: 'var(--good-tint)', color: 'var(--good)' }}>
                  Accepting guests
                </span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="p-6 border-b border-slate-200">
              <h3 className="text-lg font-semibold text-slate-900">Temporary Storage</h3>
              <p className="text-sm text-slate-600 mt-1">Media is stored only until handoff to the client is complete, then removed for privacy.</p>
            </div>

            <div className="p-6 space-y-6">
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">Used</span>
                  <span className="text-sm font-medium text-slate-900">{storageUsed} GB of {storageTotal} GB</span>
                </div>

                <div className="w-full bg-slate-200 rounded-full h-3">
                  <div
                    className="bg-violet-600 h-3 rounded-full transition-all duration-300"
                    style={{ width: `${storagePercent}%` }}
                  ></div>
                </div>

                <div className="text-xs text-slate-500">
                  {storagePercent.toFixed(1)}% used • {(storageTotal - storageUsed).toFixed(1)} GB available
                </div>

                <div className="pt-2 border-t border-slate-200 space-y-4">
                  <FormRow label="Retention before handoff" sub="How long media may remain on the system before client handoff is completed.">
                    <select
                      value={retentionPolicy}
                      onChange={(e) => { setRetentionPolicy(e.target.value); setHasChanges(true); }}
                      className="w-full md:w-40 px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent bg-white"
                    >
                      <option>Until handoff</option>
                      <option>24 hours</option>
                      <option>7 days</option>
                    </select>
                  </FormRow>

                  <FormRow label="Storage warning" sub="Alert the team when temporary event storage is nearing capacity before export.">
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        value={storageWarning}
                        onChange={(e) => { setStorageWarning(e.target.value); setHasChanges(true); }}
                        className="w-16 px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                      />
                      <span className="text-sm text-slate-600">%</span>
                    </div>
                  </FormRow>

                  <div className="space-y-3">
                    <button
                      onClick={() => setConfirmAction(confirmAction === 'clearCache' ? null : 'clearCache')}
                      disabled={actionState.clearCache === 'running'}
                      className="w-full px-4 py-3 bg-red-50 text-red-700 border border-red-200 rounded-lg hover:bg-red-100 disabled:opacity-60"
                    >
                      {actionState.clearCache === 'running' ? 'Clearing cache...' : actionState.clearCache === 'success' ? 'Cache cleared' : 'Clear temporary cache'}
                    </button>
                    {confirmAction === 'clearCache' && (
                      <div className="rounded-lg border border-red-200 bg-red-50 p-4 space-y-3">
                        <div className="text-sm font-semibold text-red-900">Clear cached derivatives?</div>
                        <div className="text-sm text-red-700">
                          This removes temporary cached files only. Event media remains until you explicitly delete it after client handoff.
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <button onClick={() => runAction('clearCache')} className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-semibold">
                            Confirm Clear
                          </button>
                          <button onClick={() => setConfirmAction(null)} className="px-4 py-2 rounded-lg border border-red-200 text-red-700 text-sm font-semibold">
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-red-50 border border-red-200 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-red-900 mb-2">⚠️ Danger Zone</h3>
              <p className="text-sm text-red-700">After client handoff, event media should be removed from the system for privacy. These actions are irreversible.</p>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {[
                  ['Export ready', workflow.handoffPrepared ? 'Ready' : 'Pending'],
                  ['Handoff complete', workflow.handoffCompleted ? 'Done' : 'Pending'],
                  ['Media deleted', workflow.mediaDeleted ? 'Done' : 'Pending'],
                  ['Event closed', workflow.eventClosed ? 'Done' : 'Pending'],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-lg border border-slate-200 p-3">
                    <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-slate-500">{label}</div>
                    <div className="text-sm font-semibold text-slate-900 mt-1">{value}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <div className="bg-white border border-slate-200 rounded-xl p-6 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h4 className="font-semibold text-slate-900">Prepare Client Handoff</h4>
                  <p className="text-sm text-slate-600 mt-1">Create the export package of all event media for delivery to the client.</p>
                </div>
                <button
                  onClick={() => runAction('exportPackage')}
                  disabled={actionState.exportPackage === 'running' || workflow.eventClosed}
                  className="px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 disabled:opacity-60"
                >
                  {actionState.exportPackage === 'running' ? 'Preparing...' : workflow.handoffPrepared ? 'Export Ready' : 'Export Package'}
                </button>
              </div>

              <div className={`bg-white border rounded-xl p-6 flex flex-wrap items-center justify-between gap-4 ${!canMarkComplete ? 'opacity-70' : ''}`} style={{ borderColor: '#e2e8f0' }}>
                <div>
                  <h4 className="font-semibold text-slate-900">Mark Handoff Complete</h4>
                  <p className="text-sm text-slate-600 mt-1">Record that client delivery is finished and the event is ready for media deletion.</p>
                  {!canMarkComplete && (
                    <p className="text-xs text-amber-700 mt-2">Prepare the client handoff package first so this step follows a clear export trail.</p>
                  )}
                </div>
                <button
                  onClick={() => runAction('markComplete')}
                  disabled={!canMarkComplete || actionState.markComplete === 'running' || workflow.eventClosed}
                  className="px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 disabled:opacity-50"
                >
                  {actionState.markComplete === 'running' ? 'Marking...' : workflow.handoffCompleted ? 'Handoff Complete' : 'Mark Complete'}
                </button>
              </div>

              <div className={`bg-white border rounded-xl p-6 flex flex-wrap items-center justify-between gap-4 ${!canDeleteMedia ? 'opacity-70' : ''}`} style={{ borderColor: '#e2e8f0' }}>
                <div>
                  <h4 className="font-semibold text-slate-900">Delete Event Media</h4>
                  <p className="text-sm text-slate-600 mt-1">Remove all uploaded photos and videos from the system after successful client handoff.</p>
                  {!canDeleteMedia && (
                    <p className="text-xs text-amber-700 mt-2">Locked until client handoff is marked complete.</p>
                  )}
                </div>
                <div className="space-y-2">
                  <button
                    onClick={() => setConfirmAction(confirmAction === 'deleteMedia' ? null : 'deleteMedia')}
                    disabled={!canDeleteMedia || actionState.deleteMedia === 'running' || workflow.eventClosed}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                  >
                    {actionState.deleteMedia === 'running' ? 'Deleting...' : workflow.mediaDeleted ? 'Media Deleted' : 'Delete Media'}
                  </button>
                  {confirmAction === 'deleteMedia' && canDeleteMedia && (
                    <div className="rounded-lg border border-red-200 bg-red-50 p-4 space-y-3 max-w-sm">
                      <div className="text-sm font-semibold text-red-900">Delete all event media?</div>
                      <div className="text-sm text-red-700">
                        This is irreversible and should only happen after the client has received the final handoff package.
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button onClick={() => runAction('deleteMedia')} className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-semibold">
                          Confirm Delete
                        </button>
                        <button onClick={() => setConfirmAction(null)} className="px-4 py-2 rounded-lg border border-red-200 text-red-700 text-sm font-semibold">
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className={`bg-white border rounded-xl p-6 flex flex-wrap items-center justify-between gap-4 ${!canDeleteEvent ? 'opacity-70' : ''}`} style={{ borderColor: '#e2e8f0' }}>
                <div>
                  <h4 className="font-semibold text-slate-900">Delete Event Record</h4>
                  <p className="text-sm text-slate-600 mt-1">Remove remaining guest metadata and close out the event once media has been deleted.</p>
                  {!canDeleteEvent && (
                    <p className="text-xs text-amber-700 mt-2">Locked until event media has been deleted.</p>
                  )}
                </div>
                <div className="space-y-2">
                  <button
                    onClick={() => setConfirmAction(confirmAction === 'deleteEvent' ? null : 'deleteEvent')}
                    disabled={!canDeleteEvent || actionState.deleteEvent === 'running' || workflow.eventClosed}
                    className="px-4 py-2 bg-red-700 text-white rounded-lg hover:bg-red-800 disabled:opacity-50"
                  >
                    {actionState.deleteEvent === 'running' ? 'Closing...' : workflow.eventClosed ? 'Event Closed' : 'Delete Event'}
                  </button>
                  {confirmAction === 'deleteEvent' && canDeleteEvent && (
                    <div className="rounded-lg border border-red-200 bg-red-50 p-4 space-y-3 max-w-sm">
                      <div className="text-sm font-semibold text-red-900">Delete the event record?</div>
                      <div className="text-sm text-red-700">
                        Use this only after media is deleted and the event is fully handed off. Guest metadata and event record will be closed out.
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button onClick={() => runAction('deleteEvent')} className="px-4 py-2 rounded-lg bg-red-700 text-white text-sm font-semibold">
                          Confirm Closeout
                        </button>
                        <button onClick={() => setConfirmAction(null)} className="px-4 py-2 rounded-lg border border-red-200 text-red-700 text-sm font-semibold">
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {hasChanges && (
        <div className="border-t border-slate-200 bg-white px-6 py-4 flex justify-end gap-3">
          <button
            onClick={handleDiscard}
            className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50"
          >
            Discard
          </button>
          <button
            onClick={handleSave}
            disabled={saveState === 'saving'}
            className="px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 disabled:opacity-60"
          >
            {saveState === 'saving' ? 'Saving...' : saveState === 'saved' ? 'Saved' : 'Save Changes'}
          </button>
        </div>
      )}
    </div>
  );
}

function FormRow({ label, sub, children }: { label: string; sub?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 py-4 border-b border-slate-100 last:border-b-0">
      <div className="flex-1 md:pr-4">
        <div className="text-sm font-semibold text-slate-900">{label}</div>
        {sub && <div className="text-xs text-slate-500 mt-1">{sub}</div>}
      </div>
      <div className="flex-none w-full md:w-auto">{children}</div>
    </div>
  );
}

function UploadTimelineChart() {
  // Sample data - in real app this would come from API
  const data = [
    { hour: '7AM', uploads: 22 },
    { hour: '8AM', uploads: 312 },
    { hour: '9AM', uploads: 180 },
    { hour: '10AM', uploads: 95 },
    { hour: '11AM', uploads: 140 },
    { hour: '12PM', uploads: 75 },
    { hour: '1PM', uploads: 48 },
    { hour: '2PM', uploads: 285 },
    { hour: '3PM', uploads: 198 },
    { hour: '4PM', uploads: 67 },
  ];

  const maxUploads = Math.max(...data.map(d => d.uploads));
  const peakIndex = data.findIndex(d => d.uploads === maxUploads);

  return (
    <div className="relative">
      <svg viewBox="0 0 400 120" className="w-full h-24">
        {data.map((d, i) => {
          const barHeight = (d.uploads / maxUploads) * 80;
          const x = i * 40;
          const y = 100 - barHeight;
          const isPeak = i === peakIndex;

          return (
            <g key={i}>
              <rect
                x={x + 2}
                y={y}
                width={36}
                height={barHeight}
                rx={4}
                fill={isPeak ? '#8b5cff' : '#e2e8f0'}
                className={isPeak ? '' : 'opacity-60'}
              />
              {isPeak && (
                <rect
                  x={x + 2}
                  y={y}
                  width={36}
                  height={barHeight}
                  rx={4}
                  fill="url(#peakGradient)"
                />
              )}
              <text
                x={x + 20}
                y={115}
                textAnchor="middle"
                className="text-xs fill-slate-500"
                fontSize="10"
              >
                {d.hour}
              </text>
              {isPeak && (
                <text
                  x={x + 20}
                  y={y - 5}
                  textAnchor="middle"
                  className="text-xs fill-violet-600 font-semibold"
                  fontSize="10"
                >
                  {d.uploads}
                </text>
              )}
            </g>
          );
        })}
        <defs>
          <linearGradient id="peakGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ff3da3" stopOpacity="0.7" />
            <stop offset="100%" stopColor="#8b5cff" stopOpacity="0.7" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
}
