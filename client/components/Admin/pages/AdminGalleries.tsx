'use client';

import { useEffect, useState } from 'react';
import { deleteAdminPhotos, exportAdminPhotos, getAllPhotos, setAdminPhotoFlag } from '@/lib/api';
import { AdminImage, CheckIcon, DestructiveNote, SearchIcon, type AdminPhoto } from '@/components/Admin/shared/AdminShared';

type GalleryFilterId = 'all' | 'flagged';

export function AdminGalleries() {
  const [photos, setPhotos] = useState<AdminPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedPhotos, setSelectedPhotos] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<GalleryFilterId>('all');
  const [focusedPhotoId, setFocusedPhotoId] = useState<string | null>(null);
  const [galleryNotice, setGalleryNotice] = useState<{ tone: 'success' | 'warning'; message: string } | null>(null);
  const [confirmAction, setConfirmAction] = useState<{ type: 'deleteSelected' | 'deleteSingle'; photoId?: string } | null>(null);
  const [bulkRunning, setBulkRunning] = useState<'export' | 'downloadAll' | 'deleteSelected' | null>(null);

  useEffect(() => {
    let cancelled = false;

    const refreshPhotos = () => {
      getAllPhotos()
        .then((data) => {
          if (cancelled) return;
          setPhotos(data);
          setSelectedPhotos((current) => {
            const validIds = new Set(data.map((p) => p.id));
            return new Set(Array.from(current).filter((id) => validIds.has(id)));
          });
          setFocusedPhotoId((current) => (
            current && data.some((p) => p.id === current) ? current : null
          ));
          setLoading(false);
        })
        .catch(() => { if (!cancelled) setLoading(false); });
    };

    refreshPhotos();
    const id = window.setInterval(refreshPhotos, 5000);
    return () => { cancelled = true; window.clearInterval(id); };
  }, []);

  const enrichedPhotos = photos.map((p) => ({ ...p, flagged: !!p.flagged }));

  const filteredPhotos = enrichedPhotos.filter((p) => {
    const q = query.trim().toLowerCase();
    const matchesQuery = !q || `${p.filename} ${p.uploader}`.toLowerCase().includes(q);
    const matchesFilter = filter === 'flagged' ? !!p.flagged : true;
    return matchesQuery && matchesFilter;
  });

  const selectedVisibleCount = filteredPhotos.filter((p) => selectedPhotos.has(p.id)).length;
  const focusedPhoto = focusedPhotoId ? enrichedPhotos.find((p) => p.id === focusedPhotoId) || null : null;
  const flaggedCount = enrichedPhotos.filter((p) => p.flagged).length;

  const toggleSelection = (photoId: string) => {
    const next = new Set(selectedPhotos);
    if (next.has(photoId)) next.delete(photoId);
    else next.add(photoId);
    setSelectedPhotos(next);
  };

  const selectAll = () => {
    if (selectedVisibleCount === filteredPhotos.length) {
      const next = new Set(selectedPhotos);
      filteredPhotos.forEach((p) => next.delete(p.id));
      setSelectedPhotos(next);
    } else {
      const next = new Set(selectedPhotos);
      filteredPhotos.forEach((p) => next.add(p.id));
      setSelectedPhotos(next);
    }
  };

  const runBulkAction = (action: 'export' | 'downloadAll' | 'deleteSelected') => {
    setBulkRunning(action);
    setConfirmAction(null);

    if (action === 'export') {
      const ids = filteredPhotos.filter((p) => selectedPhotos.has(p.id)).map((p) => p.id);
      window.open(exportAdminPhotos({ eventId: 'demo', photoIds: ids }), '_blank', 'noopener,noreferrer');
      window.setTimeout(() => {
        setGalleryNotice({ tone: 'success', message: `${ids.length} photo${ids.length === 1 ? '' : 's'} exported.` });
        setBulkRunning(null);
      }, 300);
      return;
    }

    if (action === 'downloadAll') {
      window.open(exportAdminPhotos({ eventId: 'demo', exportAll: true }), '_blank', 'noopener,noreferrer');
      window.setTimeout(() => {
        setGalleryNotice({ tone: 'success', message: `Download prepared for ${filteredPhotos.length} photo${filteredPhotos.length === 1 ? '' : 's'}.` });
        setBulkRunning(null);
      }, 300);
      return;
    }

    const ids = filteredPhotos.filter((p) => selectedPhotos.has(p.id)).map((p) => p.id);
    deleteAdminPhotos({ eventId: 'demo', photoIds: ids })
      .then((data) => {
        setPhotos(data.photos);
        setSelectedPhotos(new Set());
        setFocusedPhotoId((current) => (current && ids.includes(current) ? null : current));
        setGalleryNotice({ tone: 'warning', message: `${data.deletedCount} photo${data.deletedCount === 1 ? '' : 's'} deleted.` });
        setBulkRunning(null);
      })
      .catch(() => {
        setGalleryNotice({ tone: 'warning', message: 'Delete failed. Please retry.' });
        setBulkRunning(null);
      });
  };

  const handleDeleteSingle = (photoId: string) => {
    setConfirmAction(null);
    deleteAdminPhotos({ eventId: 'demo', photoIds: [photoId] })
      .then((data) => {
        setPhotos(data.photos);
        setSelectedPhotos((current) => { const next = new Set(current); next.delete(photoId); return next; });
        setFocusedPhotoId((current) => (current === photoId ? null : current));
        setGalleryNotice({ tone: 'warning', message: 'Photo deleted.' });
      })
      .catch(() => setGalleryNotice({ tone: 'warning', message: 'Delete failed. Please retry.' }));
  };

  const handleFlagToggle = (photoId: string, flagged: boolean) => {
    setAdminPhotoFlag({ eventId: 'demo', photoId, flagged })
      .then((data) => {
        setPhotos((current) => current.map((p) => p.id === data.photo.id ? { ...p, flagged: data.photo.flagged } : p));
        setGalleryNotice({ tone: 'success', message: flagged ? 'Photo flagged for review.' : 'Flag removed.' });
      })
      .catch(() => setGalleryNotice({ tone: 'warning', message: 'Moderation update failed.' }));
  };

  if (loading) {
    return <div className="p-6 text-center" style={{ color: 'var(--muted)' }}>Loading photos...</div>;
  }

  return (
    <div className="p-6 flex flex-col gap-4">

      {/* Notice banner */}
      {galleryNotice && (
        <div
          className="rounded-[14px] px-4 py-3 flex items-center justify-between gap-3"
          style={{
            border: `1px solid ${galleryNotice.tone === 'success' ? 'rgba(31,143,74,.15)' : 'rgba(224,92,92,.2)'}`,
            background: galleryNotice.tone === 'success' ? 'var(--good-tint)' : 'var(--danger-tint)',
            color: galleryNotice.tone === 'success' ? 'var(--good)' : 'var(--danger)',
          }}
        >
          <span className="text-sm font-medium">{galleryNotice.message}</span>
          <button className="text-xs font-semibold shrink-0" onClick={() => setGalleryNotice(null)}>Dismiss</button>
        </div>
      )}

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Search */}
        <div className="flex items-center gap-2 px-3 py-2 rounded-full flex-1 min-w-[200px] bg-white" style={{ border: '1px solid var(--line)' }}>
          <span style={{ color: 'var(--muted)' }}><SearchIcon /></span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search photos or guests..."
            className="flex-1 bg-transparent outline-none text-[13px]"
            style={{ color: 'var(--ink)' }}
          />
        </div>

        {/* Filter chips */}
        <div className="flex gap-1.5">
          {([
            { id: 'all' as const, label: `All (${enrichedPhotos.length})` },
            { id: 'flagged' as const, label: `Flagged (${flaggedCount})` },
          ]).map((opt) => (
            <button
              key={opt.id}
              onClick={() => setFilter(opt.id)}
              className="px-3 py-1.5 rounded-full text-[12px] font-medium"
              style={{
                border: `1px solid ${filter === opt.id ? 'var(--ink)' : 'var(--line)'}`,
                background: filter === opt.id ? 'var(--ink)' : 'white',
                color: filter === opt.id ? 'white' : 'var(--ink-soft)',
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* View toggle */}
        <div className="flex items-center gap-1 rounded-[12px] p-1 bg-white" style={{ border: '1px solid var(--line)' }}>
          <button
            onClick={() => setViewMode('grid')}
            aria-label="Grid view"
            className="p-2 rounded-[10px]"
            style={viewMode === 'grid' ? { background: 'var(--violet-tint)', color: 'var(--violet-dark)' } : { color: 'var(--muted)' }}
          >⊞</button>
          <button
            onClick={() => setViewMode('list')}
            aria-label="List view"
            className="p-2 rounded-[10px]"
            style={viewMode === 'list' ? { background: 'var(--violet-tint)', color: 'var(--violet-dark)' } : { color: 'var(--muted)' }}
          >☰</button>
        </div>
      </div>

      {/* Bulk actions bar */}
      <div className="flex flex-wrap items-center gap-2 px-4 py-2.5 rounded-[12px] bg-white" style={{ border: '1px solid var(--line)' }}>
        <button
          onClick={() => runBulkAction('export')}
          disabled={selectedVisibleCount === 0 || bulkRunning === 'export'}
          className="px-3 py-1.5 rounded-[9px] text-[12px] font-semibold disabled:opacity-40"
          style={{ background: 'var(--violet-tint)', color: 'var(--violet)' }}
        >
          {bulkRunning === 'export' ? 'Exporting…' : 'Export selected'}
        </button>
        <button
          onClick={() => runBulkAction('downloadAll')}
          disabled={filteredPhotos.length === 0 || bulkRunning === 'downloadAll'}
          className="px-3 py-1.5 rounded-[9px] text-[12px] font-semibold disabled:opacity-40"
          style={{ background: 'var(--bg-deep)', color: 'var(--ink)' }}
        >
          {bulkRunning === 'downloadAll' ? 'Preparing…' : 'Download all'}
        </button>
        <button
          onClick={() => setConfirmAction({ type: 'deleteSelected' })}
          disabled={selectedVisibleCount === 0 || bulkRunning === 'deleteSelected'}
          className="px-3 py-1.5 rounded-[9px] text-[12px] font-semibold disabled:opacity-40"
          style={{ background: 'var(--danger-tint)', color: 'var(--danger)' }}
        >
          {bulkRunning === 'deleteSelected' ? 'Deleting…' : 'Delete selected'}
        </button>

        <span className="ml-auto text-[12px]" style={{ color: 'var(--muted)' }}>
          {selectedVisibleCount > 0 ? `${selectedVisibleCount} selected` : `${filteredPhotos.length} photo${filteredPhotos.length === 1 ? '' : 's'}`}
        </span>
        <button onClick={selectAll} className="text-[12px] font-semibold" style={{ color: 'var(--violet)' }}>
          {selectedVisibleCount === filteredPhotos.length && filteredPhotos.length > 0 ? 'Deselect all' : 'Select all'}
        </button>
        {selectedVisibleCount > 0 && (
          <button onClick={() => setSelectedPhotos(new Set())} className="text-[12px] font-semibold" style={{ color: 'var(--muted)' }}>
            Clear
          </button>
        )}

        {/* Inline delete confirm */}
        {confirmAction?.type === 'deleteSelected' && (
          <div className="w-full flex flex-wrap items-center gap-3 mt-1 pt-2" style={{ borderTop: '1px solid var(--line)' }}>
            <span className="text-[12px] font-medium" style={{ color: 'var(--danger)' }}>
              Delete {selectedVisibleCount} photo{selectedVisibleCount === 1 ? '' : 's'}?
            </span>
            <button
              onClick={() => runBulkAction('deleteSelected')}
              className="px-3 py-1.5 rounded-[8px] text-[12px] font-semibold text-white"
              style={{ background: 'var(--danger)' }}
            >
              Confirm
            </button>
            <button onClick={() => setConfirmAction(null)} className="text-[12px] font-semibold" style={{ color: 'var(--muted)' }}>
              Cancel
            </button>
          </div>
        )}
      </div>

      {/* Moderation review panel */}
      {focusedPhoto && (
        <div className="bg-white rounded-[14px] p-4" style={{ border: '1px solid var(--line)' }}>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-[0.08em] mb-2" style={{ color: 'var(--muted)' }}>Moderation Review</div>
              <div className="text-[16px] font-semibold" style={{ color: 'var(--ink)' }}>{focusedPhoto.uploader || 'Guest upload'}</div>
              <div className="text-[12px] mt-1" style={{ color: 'var(--muted)' }}>{focusedPhoto.filename} · {new Date(focusedPhoto.uploadedAt).toLocaleString()}</div>
              <div className="text-[11px] mt-2" style={{ color: 'var(--muted)' }}>
                {focusedPhoto.flagged ? 'Currently in the moderation queue.' : 'Mark for follow-up if it needs attention.'}
              </div>
            </div>
            <div className="flex flex-wrap gap-2 items-start">
              {focusedPhoto.flagged && <DestructiveNote>Flagged for moderation</DestructiveNote>}
              <button
                onClick={() => handleFlagToggle(focusedPhoto.id, !focusedPhoto.flagged)}
                className="px-3 py-1.5 rounded-[8px] text-[12px] font-semibold"
                style={{ background: focusedPhoto.flagged ? 'var(--bg-deep)' : 'var(--violet-tint)', color: focusedPhoto.flagged ? 'var(--ink-soft)' : 'var(--violet)' }}
              >
                {focusedPhoto.flagged ? 'Mark reviewed' : 'Flag for review'}
              </button>
              <button
                onClick={() => setFocusedPhotoId(null)}
                className="px-3 py-1.5 rounded-[8px] text-[12px] font-semibold"
                style={{ border: '1px solid var(--line)', color: 'var(--ink-soft)' }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Photo grid / list */}
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
                <div
                  className="absolute top-2 left-2 w-[18px] h-[18px] rounded-full grid place-items-center"
                  style={{
                    background: selectedPhotos.has(photo.id) ? 'var(--violet)' : 'rgba(255,255,255,.72)',
                    border: selectedPhotos.has(photo.id) ? '2px solid var(--violet)' : '2px solid rgba(0,0,0,.15)',
                  }}
                >
                  {selectedPhotos.has(photo.id) && <span className="text-white"><CheckIcon /></span>}
                </div>
                {photo.flagged && <div className="absolute top-2 right-2"><DestructiveNote>Flagged</DestructiveNote></div>}
                <div className="absolute inset-x-0 bottom-0 px-2.5 py-2" style={{ background: 'linear-gradient(to top, rgba(18,18,41,.82), transparent)' }}>
                  <div className="text-[11px] font-semibold truncate text-white">{photo.uploader || 'Guest'}</div>
                  <div className="text-[10px] truncate" style={{ color: 'rgba(255,255,255,.75)' }}>{new Date(photo.uploadedAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</div>
                  <div className="mt-2 flex gap-2">
                    <button
                      onClick={(e) => { e.stopPropagation(); setFocusedPhotoId(photo.id); }}
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
            {filteredPhotos.map((photo, i) => (
              <div
                key={photo.id}
                style={{
                  borderTop: i === 0 ? 'none' : '1px solid var(--line)',
                  background: selectedPhotos.has(photo.id) ? 'var(--violet-tint)' : '#fff',
                }}
              >
                {/* Desktop row */}
                <div className="hidden xl:grid grid-cols-[.4fr_.9fr_1.5fr_.9fr_1fr] px-[14px] py-[10px] items-center">
                  <div><input type="checkbox" checked={selectedPhotos.has(photo.id)} onChange={() => toggleSelection(photo.id)} className="rounded border-slate-300" /></div>
                  <div className="relative w-11 h-11 rounded-[8px] overflow-hidden" style={{ background: 'var(--bg-deep)' }}>
                    <AdminImage src={photo.thumbUrl || photo.url} alt={`${photo.uploader || 'Guest'} thumbnail`} sizes="44px" />
                  </div>
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold text-white shrink-0" style={{ background: 'var(--neon-gradient)' }}>
                      {(photo.uploader || 'G').charAt(0).toUpperCase()}
                    </div>
                    <span className="text-[13px] font-semibold truncate" style={{ color: 'var(--ink)' }}>{photo.uploader || 'Guest'}</span>
                    {photo.flagged && <DestructiveNote>Flagged</DestructiveNote>}
                  </div>
                  <div className="text-[12px]" style={{ color: 'var(--muted)' }}>{new Date(photo.uploadedAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</div>
                  <div className="flex gap-1.5">
                    <button onClick={() => setFocusedPhotoId(photo.id)} className="px-2.5 py-1 rounded-[7px] text-[11px]" style={{ border: '1px solid var(--line)', color: 'var(--ink-soft)' }}>View</button>
                    <button
                      onClick={() => handleFlagToggle(photo.id, !photo.flagged)}
                      className="px-2.5 py-1 rounded-[7px] text-[11px] font-semibold"
                      style={{ background: photo.flagged ? 'var(--bg-deep)' : 'var(--violet-tint)', color: photo.flagged ? 'var(--ink-soft)' : 'var(--violet)' }}
                    >
                      {photo.flagged ? 'Reviewed' : 'Flag'}
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

                {/* Mobile card */}
                <div className="xl:hidden p-4 space-y-3">
                  <div className="flex items-start gap-3">
                    <input type="checkbox" checked={selectedPhotos.has(photo.id)} onChange={() => toggleSelection(photo.id)} className="mt-3 rounded border-slate-300" />
                    <div className="relative w-14 h-14 rounded-[10px] overflow-hidden flex-none" style={{ background: 'var(--bg-deep)' }}>
                      <AdminImage src={photo.thumbUrl || photo.url} alt={`${photo.uploader || 'Guest'} thumbnail`} sizes="56px" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-[13px] font-semibold truncate" style={{ color: 'var(--ink)' }}>{photo.uploader || 'Guest'}</div>
                      <div className="text-[12px]" style={{ color: 'var(--muted)' }}>{new Date(photo.uploadedAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</div>
                      {photo.flagged && <div className="mt-2"><DestructiveNote>Flagged for review</DestructiveNote></div>}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button onClick={() => setFocusedPhotoId(photo.id)} className="px-2.5 py-1 rounded-[7px] text-[11px]" style={{ border: '1px solid var(--line)', color: 'var(--ink-soft)' }}>View</button>
                    <button
                      onClick={() => handleFlagToggle(photo.id, !photo.flagged)}
                      className="px-2.5 py-1 rounded-[7px] text-[11px] font-semibold"
                      style={{ background: photo.flagged ? 'var(--bg-deep)' : 'var(--violet-tint)', color: photo.flagged ? 'var(--ink-soft)' : 'var(--violet)' }}
                    >
                      {photo.flagged ? 'Reviewed' : 'Flag'}
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
                      <span className="text-[12px] font-medium" style={{ color: 'var(--danger)' }}>Delete this photo?</span>
                      <button onClick={() => handleDeleteSingle(photo.id)} className="px-3 py-1.5 rounded-[8px] text-[12px] font-semibold text-white" style={{ background: 'var(--danger)' }}>Confirm</button>
                      <button onClick={() => setConfirmAction(null)} className="text-[12px] font-semibold" style={{ color: 'var(--muted)' }}>Cancel</button>
                    </div>
                  )}
                </div>

                {/* Desktop single-delete confirm */}
                {confirmAction?.type === 'deleteSingle' && confirmAction.photoId === photo.id && (
                  <div className="hidden xl:flex items-center gap-3 px-4 pb-3">
                    <span className="text-[12px] font-medium" style={{ color: 'var(--danger)' }}>Delete this photo?</span>
                    <button onClick={() => handleDeleteSingle(photo.id)} className="px-3 py-1.5 rounded-[8px] text-[12px] font-semibold text-white" style={{ background: 'var(--danger)' }}>Confirm</button>
                    <button onClick={() => setConfirmAction(null)} className="text-[12px] font-semibold" style={{ color: 'var(--muted)' }}>Cancel</button>
                  </div>
                )}
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
            {filter === 'flagged' ? 'No media is currently flagged for moderation' : 'No photos uploaded yet'}
          </div>
        </div>
      )}
    </div>
  );
}
