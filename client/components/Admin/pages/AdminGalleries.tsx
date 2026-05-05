'use client';

import { useEffect, useState } from 'react';
import { getAllPhotos } from '@/lib/api';
import { AdminImage, CheckIcon, DestructiveNote, SearchIcon, type AdminPhoto } from '@/components/Admin/shared/AdminShared';

export function AdminGalleries() {
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
    if (newSelected.has(photoId)) newSelected.delete(photoId);
    else newSelected.add(photoId);
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
          <button className="text-xs font-semibold" onClick={() => setGalleryNotice(null)}>Dismiss</button>
        </div>
      )}

      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="flex items-center gap-2 px-4 py-2 rounded-full min-w-[220px] flex-1 bg-white" style={{ border: '1px solid var(--line)' }}>
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
          <button onClick={() => setViewMode('grid')} aria-label="Grid view" className="p-2 rounded-[10px]" style={viewMode === 'grid' ? { background: 'var(--violet-tint)', color: 'var(--violet-dark)' } : { color: 'var(--muted)', background: 'transparent' }}>⊞</button>
          <button onClick={() => setViewMode('list')} aria-label="List view" className="p-2 rounded-[10px]" style={viewMode === 'list' ? { background: 'var(--violet-tint)', color: 'var(--violet-dark)' } : { color: 'var(--muted)', background: 'transparent' }}>☰</button>
        </div>
      </div>

      {selectedPhotos.size > 0 && (
        <div className="rounded-[10px] px-4 py-2.5 mb-4 flex flex-wrap items-center gap-3" style={{ background: 'var(--violet-tint)', border: '1px solid rgba(139,92,255,.2)' }}>
          <span className="text-[13px] font-semibold" style={{ color: 'var(--violet-dark)' }}>{selectedVisibleCount} visible selected</span>
          <button onClick={() => runBulkAction('export')} disabled={selectedVisibleCount === 0 || actionState.export === 'running'} className="px-3.5 py-1.5 rounded-[8px] text-[12px] font-semibold disabled:opacity-50" style={{ color: 'var(--violet)', background: 'var(--violet-tint)', border: '1px solid rgba(139,92,255,.25)' }}>
            {actionState.export === 'running' ? 'Preparing...' : actionState.export === 'success' ? 'Export Ready' : 'Export ZIP'}
          </button>
          <button onClick={() => setConfirmAction({ type: 'deleteSelected' })} disabled={selectedVisibleCount === 0 || actionState.deleteSelected === 'running'} className="px-3.5 py-1.5 rounded-[8px] text-[12px] font-semibold disabled:opacity-50" style={{ color: 'var(--danger)', background: 'var(--danger-tint)', border: '1px solid rgba(224,92,92,.2)' }}>
            {actionState.deleteSelected === 'running' ? 'Deleting...' : 'Delete'}
          </button>
          {confirmAction?.type === 'deleteSelected' && (
            <div className="w-full rounded-[10px] border p-3 flex flex-wrap items-center gap-3" style={{ borderColor: 'rgba(224,92,92,.2)', background: 'rgba(253,231,236,.72)' }}>
              <div className="text-[12px] font-medium" style={{ color: 'var(--danger)' }}>Delete {selectedVisibleCount} visible selected photo{selectedVisibleCount === 1 ? '' : 's'} from the client-side gallery?</div>
              <button onClick={() => runBulkAction('deleteSelected')} className="px-3 py-1.5 rounded-[8px] text-[12px] font-semibold text-white" style={{ background: 'var(--danger)' }}>Confirm Delete</button>
              <button onClick={() => setConfirmAction(null)} className="text-[12px] font-semibold" style={{ color: 'var(--muted)' }}>Cancel</button>
            </div>
          )}
          <DestructiveNote>Deletes only visible selection</DestructiveNote>
          <button onClick={() => setSelectedPhotos(new Set())} className="text-[12px] lg:ml-auto" style={{ color: 'var(--muted)' }}>Clear</button>
        </div>
      )}

      {focusedPhoto && (
        <div className="bg-white rounded-[14px] p-4 mb-4" style={{ border: '1px solid var(--line)' }}>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-[0.08em] mb-2" style={{ color: 'var(--muted)' }}>Review Queue</div>
              <div className="text-[16px] font-semibold" style={{ color: 'var(--ink)' }}>{focusedPhoto.uploader || 'Guest upload'}</div>
              <div className="text-[12px] mt-1" style={{ color: 'var(--muted)' }}>{focusedPhoto.filename} • {new Date(focusedPhoto.uploadedAt).toLocaleString()}</div>
            </div>
            <div className="flex flex-wrap gap-2">
              {focusedPhoto.flagged ? <DestructiveNote>Flagged for moderation</DestructiveNote> : null}
              <button onClick={() => setFocusedPhotoId(null)} className="px-3 py-1.5 rounded-[8px] text-[12px] font-semibold" style={{ border: '1px solid var(--line)', color: 'var(--ink-soft)' }}>Close Review</button>
            </div>
          </div>
        </div>
      )}

      {filteredPhotos.length > 0 ? (
        viewMode === 'grid' ? (
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 2xl:grid-cols-6 gap-3">
            {filteredPhotos.map((photo) => (
              <div key={photo.id} className="relative aspect-square rounded-[14px] overflow-hidden border-2 cursor-pointer" style={{ background: 'var(--bg-deep)', borderColor: selectedPhotos.has(photo.id) ? 'var(--violet)' : focusedPhotoId === photo.id ? 'var(--ink)' : 'transparent' }} onClick={() => toggleSelection(photo.id)}>
                <AdminImage src={photo.thumbUrl || photo.url} alt={`${photo.uploader || 'Guest'} photo`} sizes="(max-width: 768px) 50vw, (max-width: 1280px) 33vw, 240px" />
                <div className="absolute top-2 left-2 w-[18px] h-[18px] rounded-full grid place-items-center" style={{ background: selectedPhotos.has(photo.id) ? 'var(--violet)' : 'rgba(255,255,255,.72)', border: selectedPhotos.has(photo.id) ? '2px solid var(--violet)' : '2px solid rgba(0,0,0,.15)' }}>
                  {selectedPhotos.has(photo.id) && <span className="text-white"><CheckIcon /></span>}
                </div>
                {photo.flagged && <div className="absolute top-2 right-2"><DestructiveNote>Flagged</DestructiveNote></div>}
                <div className="absolute inset-x-0 bottom-0 px-2.5 py-2" style={{ background: 'linear-gradient(to top, rgba(18,18,41,.82), transparent)' }}>
                  <div className="text-[11px] font-semibold truncate text-white">{photo.uploader || 'Guest'}</div>
                  <div className="text-[10px] truncate" style={{ color: 'rgba(255,255,255,.75)' }}>{new Date(photo.uploadedAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</div>
                  <div className="mt-2 flex gap-2">
                    <button onClick={(e) => { e.stopPropagation(); setFocusedPhotoId(photo.id); }} className="px-2 py-1 rounded-[7px] text-[10px] font-semibold" style={{ background: 'rgba(255,255,255,.92)', color: 'var(--ink)' }}>Review</button>
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
              <input type="checkbox" checked={filteredPhotos.length > 0 && selectedVisibleCount === filteredPhotos.length} onChange={selectAll} className="rounded border-slate-300" />
              <span className="text-sm font-medium" style={{ color: 'var(--ink-soft)' }}>Select All Visible</span>
            </div>
            {filteredPhotos.map((photo) => (
              <div key={photo.id} style={{ borderTop: '1px solid var(--line)', background: selectedPhotos.has(photo.id) ? 'var(--violet-tint)' : '#fff' }}>
                <div className="hidden xl:grid grid-cols-[.4fr_.9fr_1.5fr_.9fr_1fr] px-[14px] py-[10px] items-center">
                  <div><input type="checkbox" checked={selectedPhotos.has(photo.id)} onChange={() => toggleSelection(photo.id)} className="rounded border-slate-300" /></div>
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
                    <button onClick={() => setFocusedPhotoId(photo.id)} className="px-2.5 py-1 rounded-[7px] text-[11px]" style={{ border: '1px solid var(--line)', color: 'var(--ink-soft)' }}>View</button>
                    <button onClick={() => setConfirmAction({ type: 'deleteSingle', photoId: photo.id })} className="px-2.5 py-1 rounded-[7px] text-[11px] font-semibold" style={{ background: 'var(--danger-tint)', color: 'var(--danger)' }}>Delete</button>
                  </div>
                </div>
                <div className="xl:hidden p-4 space-y-3">
                  <div className="flex items-start gap-3">
                    <input type="checkbox" checked={selectedPhotos.has(photo.id)} onChange={() => toggleSelection(photo.id)} className="mt-3 rounded border-slate-300" />
                    <div className="relative w-14 h-14 rounded-[10px] overflow-hidden flex-none" style={{ background: 'var(--bg-deep)' }}>
                      <AdminImage src={photo.thumbUrl || photo.url} alt={`${photo.uploader || 'Guest'} thumbnail`} sizes="56px" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-[13px] font-semibold truncate" style={{ color: 'var(--ink)' }}>{photo.uploader || 'Guest'}</div>
                      <div className="text-[12px]" style={{ color: 'var(--muted)' }}>Uploaded {new Date(photo.uploadedAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</div>
                      {photo.flagged ? <div className="mt-2"><DestructiveNote>Flagged for review</DestructiveNote></div> : null}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button onClick={() => setFocusedPhotoId(photo.id)} className="px-2.5 py-1 rounded-[7px] text-[11px]" style={{ border: '1px solid var(--line)', color: 'var(--ink-soft)' }}>View</button>
                    <button onClick={() => setConfirmAction({ type: 'deleteSingle', photoId: photo.id })} className="px-2.5 py-1 rounded-[7px] text-[11px] font-semibold" style={{ background: 'var(--danger-tint)', color: 'var(--danger)' }}>Delete</button>
                  </div>
                  {confirmAction?.type === 'deleteSingle' && confirmAction.photoId === photo.id && (
                    <div className="rounded-[10px] border p-3 flex flex-wrap items-center gap-3" style={{ borderColor: 'rgba(224,92,92,.2)', background: 'rgba(253,231,236,.72)' }}>
                      <div className="text-[12px] font-medium" style={{ color: 'var(--danger)' }}>Remove this photo from the client-side gallery state?</div>
                      <button onClick={() => handleDeleteSingle(photo.id)} className="px-3 py-1.5 rounded-[8px] text-[12px] font-semibold text-white" style={{ background: 'var(--danger)' }}>Confirm Delete</button>
                      <button onClick={() => setConfirmAction(null)} className="text-[12px] font-semibold" style={{ color: 'var(--muted)' }}>Cancel</button>
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
            <button onClick={() => runBulkAction('export')} disabled={selectedVisibleCount === 0 || actionState.export === 'running'} className="w-full px-3 py-2 rounded-[9px] text-[12px] font-semibold text-left disabled:opacity-50" style={{ color: 'var(--violet)', background: 'var(--violet-tint)' }}>
              {actionState.export === 'running' ? 'Preparing selected export...' : 'Export selected (ZIP)'}
            </button>
            <button onClick={() => runBulkAction('downloadAll')} disabled={filteredPhotos.length === 0 || actionState.downloadAll === 'running'} className="w-full px-3 py-2 rounded-[9px] text-[12px] font-semibold text-left disabled:opacity-50" style={{ color: 'var(--ink)', background: 'var(--bg-deep)' }}>
              {actionState.downloadAll === 'running' ? 'Preparing download...' : 'Download all visible media'}
            </button>
            <button onClick={() => setConfirmAction({ type: 'deleteSelected' })} disabled={selectedVisibleCount === 0 || actionState.deleteSelected === 'running'} className="w-full px-3 py-2 rounded-[9px] text-[12px] font-semibold text-left disabled:opacity-50" style={{ color: 'var(--danger)', background: 'var(--danger-tint)' }}>
              {actionState.deleteSelected === 'running' ? 'Deleting selected...' : 'Delete selected'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
