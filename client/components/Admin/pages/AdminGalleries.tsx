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
  const [notice, setNotice] = useState<{ tone: 'success' | 'warning'; message: string } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<'bulk' | string | null>(null);
  const [bulkRunning, setBulkRunning] = useState<'export' | 'delete' | null>(null);

  useEffect(() => {
    let cancelled = false;
    const refresh = () => {
      getAllPhotos()
        .then((data) => {
          if (cancelled) return;
          setPhotos(data);
          setSelectedPhotos((cur) => {
            const valid = new Set(data.map((p) => p.id));
            return new Set(Array.from(cur).filter((id) => valid.has(id)));
          });
          setFocusedPhotoId((cur) => (cur && data.some((p) => p.id === cur) ? cur : null));
          setLoading(false);
        })
        .catch(() => { if (!cancelled) setLoading(false); });
    };
    refresh();
    const id = window.setInterval(refresh, 5000);
    return () => { cancelled = true; window.clearInterval(id); };
  }, []);

  const enriched = photos.map((p) => ({ ...p, flagged: !!p.flagged }));
  const filtered = enriched.filter((p) => {
    const q = query.trim().toLowerCase();
    const matchQ = !q || `${p.filename} ${p.uploader}`.toLowerCase().includes(q);
    const matchF = filter === 'flagged' ? p.flagged : true;
    return matchQ && matchF;
  });

  const flaggedCount = enriched.filter((p) => p.flagged).length;
  const selectedCount = filtered.filter((p) => selectedPhotos.has(p.id)).length;
  const allSelected = filtered.length > 0 && selectedCount === filtered.length;
  const focusedPhoto = focusedPhotoId ? enriched.find((p) => p.id === focusedPhotoId) ?? null : null;

  function toggleSelection(id: string) {
    const next = new Set(selectedPhotos);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelectedPhotos(next);
  }

  function toggleSelectAll() {
    const next = new Set(selectedPhotos);
    if (allSelected) filtered.forEach((p) => next.delete(p.id));
    else filtered.forEach((p) => next.add(p.id));
    setSelectedPhotos(next);
  }

  function runExport() {
    setBulkRunning('export');
    const ids = filtered.filter((p) => selectedPhotos.has(p.id)).map((p) => p.id);
    window.open(exportAdminPhotos({ eventId: 'demo', photoIds: ids }), '_blank', 'noopener,noreferrer');
    window.setTimeout(() => {
      setNotice({ tone: 'success', message: `${ids.length} photo${ids.length === 1 ? '' : 's'} exported.` });
      setBulkRunning(null);
    }, 300);
  }

  function runDelete() {
    setBulkRunning('delete');
    setConfirmDelete(null);
    const ids = filtered.filter((p) => selectedPhotos.has(p.id)).map((p) => p.id);
    deleteAdminPhotos({ eventId: 'demo', photoIds: ids })
      .then((data) => {
        setPhotos(data.photos);
        setSelectedPhotos(new Set());
        setFocusedPhotoId((cur) => (cur && ids.includes(cur) ? null : cur));
        setNotice({ tone: 'warning', message: `${data.deletedCount} photo${data.deletedCount === 1 ? '' : 's'} deleted.` });
        setBulkRunning(null);
      })
      .catch(() => { setNotice({ tone: 'warning', message: 'Delete failed. Please retry.' }); setBulkRunning(null); });
  }

  function runDeleteSingle(photoId: string) {
    setConfirmDelete(null);
    deleteAdminPhotos({ eventId: 'demo', photoIds: [photoId] })
      .then((data) => {
        setPhotos(data.photos);
        setSelectedPhotos((cur) => { const next = new Set(cur); next.delete(photoId); return next; });
        setFocusedPhotoId((cur) => (cur === photoId ? null : cur));
        setNotice({ tone: 'warning', message: 'Photo deleted.' });
      })
      .catch(() => setNotice({ tone: 'warning', message: 'Delete failed. Please retry.' }));
  }

  function runFlagToggle(photoId: string, flagged: boolean) {
    setAdminPhotoFlag({ eventId: 'demo', photoId, flagged })
      .then((data) => {
        setPhotos((cur) => cur.map((p) => (p.id === data.photo.id ? { ...p, flagged: data.photo.flagged } : p)));
        setNotice({ tone: 'success', message: flagged ? 'Photo flagged for review.' : 'Flag removed.' });
      })
      .catch(() => setNotice({ tone: 'warning', message: 'Moderation update failed.' }));
  }

  if (loading) {
    return <div className="p-8 text-center text-[14px]" style={{ color: 'var(--muted)' }}>Loading photos…</div>;
  }

  return (
    <div className="flex flex-col min-h-full">

      {/* ── Notice banner ──────────────────────────────────────── */}
      {notice && (
        <div
          className="mx-6 mt-5 rounded-[12px] px-4 py-2.5 flex items-center justify-between gap-3"
          style={{
            border: `1px solid ${notice.tone === 'success' ? 'rgba(31,143,74,.15)' : 'rgba(224,92,92,.2)'}`,
            background: notice.tone === 'success' ? 'var(--good-tint)' : 'var(--danger-tint)',
            color: notice.tone === 'success' ? 'var(--good)' : 'var(--danger)',
          }}
        >
          <span className="text-[13px] font-medium">{notice.message}</span>
          <button className="text-[12px] font-semibold shrink-0" onClick={() => setNotice(null)}>Dismiss</button>
        </div>
      )}

      {/* ── Toolbar ────────────────────────────────────────────── */}
      <div className="px-6 pt-5 pb-4 flex flex-wrap items-center gap-2.5">
        {/* Search */}
        <div className="flex items-center gap-2 px-3 py-2 rounded-full flex-1 min-w-[180px] " style={{ background: 'var(--bg)', border: '1px solid var(--line)' }}>
          <span style={{ color: 'var(--muted)' }}><SearchIcon /></span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search photos or guests…"
            className="flex-1 bg-transparent outline-none text-[13px]"
            style={{ color: 'var(--ink)' }}
          />
        </div>

        {/* Filter chips */}
        {([
          { id: 'all' as const,     label: `All · ${enriched.length}` },
          { id: 'flagged' as const, label: `Flagged · ${flaggedCount}` },
        ]).map((opt) => (
          <button
            key={opt.id}
            onClick={() => setFilter(opt.id)}
            className="px-3 py-1.5 rounded-full text-[12px] font-semibold"
            style={{
              border: `1px solid ${filter === opt.id ? 'var(--violet)' : 'var(--line)'}`,
              background: filter === opt.id ? 'var(--violet)' : 'var(--bg-soft)',
              color: filter === opt.id ? 'white' : 'var(--ink-soft)',
            }}
          >
            {opt.label}
          </button>
        ))}

        <div className="flex-1 hidden sm:block" />

        {/* Download all — primary persistent action */}
        <a
          href={exportAdminPhotos({ eventId: 'demo', exportAll: true })}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-1.5 px-4 py-2 rounded-[10px] text-[13px] font-semibold"
          style={{ background: 'var(--violet)', color: 'white' }}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
          </svg>
          Download all
        </a>

        {/* View toggle */}
        <div className="flex items-center gap-1 rounded-[12px] p-1 " style={{ background: 'var(--bg)', border: '1px solid var(--line)' }}>
          <button
            onClick={() => setViewMode('grid')}
            aria-label="Grid view"
            className="p-2 rounded-[10px] text-[16px] leading-none"
            style={viewMode === 'grid' ? { background: 'var(--violet-tint)', color: 'var(--violet-dark)' } : { color: 'var(--muted)' }}
          >⊞</button>
          <button
            onClick={() => setViewMode('list')}
            aria-label="List view"
            className="p-2 rounded-[10px] text-[16px] leading-none"
            style={viewMode === 'list' ? { background: 'var(--violet-tint)', color: 'var(--violet-dark)' } : { color: 'var(--muted)' }}
          >☰</button>
        </div>
      </div>

      {/* ── Moderation review panel ─────────────────────────────── */}
      {focusedPhoto && (
        <div className="mx-6 mb-4 rounded-[14px] p-4" style={{ background: 'var(--bg)', border: '1px solid var(--line)' }}>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-[0.08em] mb-2" style={{ color: 'var(--muted)' }}>
                Moderation Review
              </div>
              <div className="text-[16px] font-semibold" style={{ color: 'var(--ink)' }}>
                {focusedPhoto.uploader || 'Guest upload'}
              </div>
              <div className="text-[12px] mt-1" style={{ color: 'var(--muted)' }}>
                {focusedPhoto.filename} · {new Date(focusedPhoto.uploadedAt).toLocaleString()}
              </div>
              <div className="text-[11px] mt-2" style={{ color: 'var(--muted)' }}>
                {focusedPhoto.flagged
                  ? 'Currently in the moderation queue.'
                  : 'Mark for follow-up if it needs attention.'}
              </div>
            </div>
            <div className="flex flex-wrap gap-2 items-start">
              {focusedPhoto.flagged && <DestructiveNote>Flagged</DestructiveNote>}
              <button
                onClick={() => runFlagToggle(focusedPhoto.id, !focusedPhoto.flagged)}
                className="px-3 py-1.5 rounded-[8px] text-[12px] font-semibold"
                style={{
                  background: focusedPhoto.flagged ? 'var(--bg-deep)' : 'var(--violet-tint)',
                  color: focusedPhoto.flagged ? 'var(--ink-soft)' : 'var(--violet)',
                }}
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

      {/* ── Photos ─────────────────────────────────────────────── */}
      <div className="px-6 pb-28 flex-1">
        {filtered.length > 0 ? (
          viewMode === 'grid' ? (
            /* Grid */
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 2xl:grid-cols-6 gap-3">
              {filtered.map((photo) => {
                const selected = selectedPhotos.has(photo.id);
                const focused = focusedPhotoId === photo.id;
                return (
                  <div
                    key={photo.id}
                    className="relative aspect-square rounded-[14px] overflow-hidden cursor-pointer transition-transform active:scale-[.97]"
                    style={{
                      background: 'var(--bg-deep)',
                      outline: selected ? '2.5px solid var(--violet)' : focused ? '2px solid var(--ink)' : '2px solid transparent',
                      outlineOffset: selected ? '-2px' : '-1px',
                    }}
                    onClick={() => toggleSelection(photo.id)}
                  >
                    <AdminImage
                      src={photo.thumbUrl || photo.url}
                      alt={`${photo.uploader || 'Guest'} photo`}
                      sizes="(max-width: 768px) 50vw, (max-width: 1280px) 33vw, 240px"
                    />

                    {/* Selection checkbox */}
                    <div
                      className="absolute top-2 left-2 w-5 h-5 rounded-full grid place-items-center transition-colors"
                      style={{
                        background: selected ? 'var(--violet)' : 'rgba(255,255,255,.8)',
                        border: selected ? '2px solid var(--violet)' : '1.5px solid rgba(0,0,0,.2)',
                        boxShadow: '0 1px 3px rgba(0,0,0,.15)',
                      }}
                    >
                      {selected && <span className="text-white scale-90"><CheckIcon /></span>}
                    </div>

                    {/* Flagged badge */}
                    {photo.flagged && (
                      <div className="absolute top-2 right-2">
                        <DestructiveNote>Flagged</DestructiveNote>
                      </div>
                    )}

                    {/* Bottom info + Review button */}
                    <div
                      className="absolute inset-x-0 bottom-0 px-2.5 py-2"
                      style={{ background: 'linear-gradient(to top, rgba(18,18,41,.85), transparent)' }}
                    >
                      <div className="text-[11px] font-semibold truncate text-white">{photo.uploader || 'Guest'}</div>
                      <div className="text-[10px]" style={{ color: 'rgba(255,255,255,.7)' }}>
                        {new Date(photo.uploadedAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); setFocusedPhotoId(photo.id); }}
                        className="mt-1.5 px-2 py-0.5 rounded-[6px] text-[10px] font-semibold"
                        style={{ background: 'rgba(255,255,255,.15)', color: 'white', backdropFilter: 'blur(6px)', border: '1px solid rgba(255,255,255,.25)' }}
                      >
                        Review
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* List */
            <div className="rounded-[14px] overflow-hidden" style={{ background: 'var(--bg)', border: '1px solid var(--line)' }}>
              {/* List header */}
              <div className="flex items-center gap-3 px-4 py-2.5" style={{ background: 'var(--bg-deep)', borderBottom: '1px solid var(--line)' }}>
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleSelectAll}
                  className="rounded border-slate-300 cursor-pointer"
                />
                <span className="text-[11px] font-bold uppercase tracking-[0.07em]" style={{ color: 'var(--muted)' }}>
                  {allSelected ? 'Deselect all' : `Select all (${filtered.length})`}
                </span>
              </div>

              {filtered.map((photo) => (
                <div key={photo.id} style={{ borderTop: '1px solid var(--line)', background: selectedPhotos.has(photo.id) ? 'var(--violet-tint)' : 'var(--bg)' }}>
                  {/* Main row */}
                  <div className="flex items-center gap-3 px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selectedPhotos.has(photo.id)}
                      onChange={() => toggleSelection(photo.id)}
                      className="rounded border-slate-300 cursor-pointer shrink-0"
                    />
                    <div className="relative w-11 h-11 rounded-[8px] overflow-hidden flex-none" style={{ background: 'var(--bg-deep)' }}>
                      <AdminImage src={photo.thumbUrl || photo.url} alt="" sizes="44px" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-semibold truncate" style={{ color: 'var(--ink)' }}>
                        {photo.uploader || 'Guest'}
                      </div>
                      <div className="text-[11px]" style={{ color: 'var(--muted)' }}>
                        {new Date(photo.uploadedAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                      </div>
                    </div>
                    {photo.flagged && <DestructiveNote>Flagged</DestructiveNote>}
                    <div className="flex gap-1.5 shrink-0">
                      <button
                        onClick={() => setFocusedPhotoId(photo.id)}
                        className="px-2.5 py-1 rounded-[7px] text-[11px] font-medium"
                        style={{ border: '1px solid var(--line)', color: 'var(--ink-soft)' }}
                      >
                        Review
                      </button>
                      <button
                        onClick={() => runFlagToggle(photo.id, !photo.flagged)}
                        className="px-2.5 py-1 rounded-[7px] text-[11px] font-semibold"
                        style={{
                          background: photo.flagged ? 'var(--bg-deep)' : 'var(--violet-tint)',
                          color: photo.flagged ? 'var(--ink-soft)' : 'var(--violet)',
                        }}
                      >
                        {photo.flagged ? 'Reviewed' : 'Flag'}
                      </button>
                      <button
                        onClick={() => setConfirmDelete(photo.id)}
                        className="px-2.5 py-1 rounded-[7px] text-[11px] font-semibold"
                        style={{ background: 'var(--danger-tint)', color: 'var(--danger)' }}
                      >
                        Delete
                      </button>
                    </div>
                  </div>

                  {/* Single delete confirm — inline below the row */}
                  {confirmDelete === photo.id && (
                    <div className="px-4 pb-3 flex flex-wrap items-center gap-3" style={{ borderTop: '1px solid var(--line)', paddingTop: 10 }}>
                      <span className="text-[12px] font-semibold" style={{ color: 'var(--danger)' }}>
                        Delete this photo permanently?
                      </span>
                      <button
                        onClick={() => runDeleteSingle(photo.id)}
                        className="px-3 py-1.5 rounded-[8px] text-[12px] font-semibold text-white"
                        style={{ background: 'var(--danger)' }}
                      >
                        Confirm
                      </button>
                      <button
                        onClick={() => setConfirmDelete(null)}
                        className="text-[12px] font-semibold"
                        style={{ color: 'var(--muted)' }}
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )
        ) : (
          /* Empty state */
          <div className="text-center py-16">
            <div className="w-16 h-16 rounded-[18px] mx-auto mb-4 flex items-center justify-center" style={{ background: 'var(--violet-tint)', border: '1px solid var(--line)' }}>
              <svg viewBox="0 0 24 24" className="w-7 h-7" fill="none" stroke="var(--violet)" strokeWidth="1.8">
                <path d="M4 8h4l1.5-2h5L16 8h4v10H4z" />
                <circle cx="12" cy="13" r="3.2" />
              </svg>
            </div>
            <div className="text-[14px]" style={{ color: 'var(--muted)' }}>
              {filter === 'flagged' ? 'No photos flagged for moderation' : 'No photos uploaded yet'}
            </div>
          </div>
        )}
      </div>

      {/* ── Sticky bulk selection bar ───────────────────────────── */}
      {/*   Floats as a dark pill — appears only when selecting.    */}
      {selectedCount > 0 && (
        <div className="sticky bottom-0 z-10 px-6 py-4 flex justify-center pointer-events-none">
          <div
            className="pointer-events-auto flex flex-wrap items-center gap-2 px-5 py-3 rounded-2xl"
            style={{
              background: '#0d0b20',
              border: '1px solid rgba(255,255,255,.08)',
              boxShadow: '0 8px 32px rgba(0,0,0,.5), 0 2px 8px rgba(0,0,0,.3)',
              animation: 'slide-up 0.18s ease-out',
              maxWidth: 600,
              width: '100%',
            }}
          >
          {confirmDelete === 'bulk' ? (
            /* Confirm state */
            <>
              <svg className="w-4 h-4 shrink-0" style={{ color: '#f87171' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
              <span className="text-[13px] font-semibold text-white">
                Delete {selectedCount} photo{selectedCount === 1 ? '' : 's'} permanently?
              </span>
              <div className="flex-1" />
              <button
                onClick={runDelete}
                disabled={bulkRunning === 'delete'}
                className="px-4 py-1.5 rounded-[9px] text-[13px] font-semibold text-white disabled:opacity-60"
                style={{ background: '#e05c5c' }}
              >
                {bulkRunning === 'delete' ? 'Deleting…' : 'Confirm delete'}
              </button>
              <button
                onClick={() => setConfirmDelete(null)}
                className="text-[13px] font-semibold"
                style={{ color: 'rgba(255,255,255,.45)' }}
              >
                Cancel
              </button>
            </>
          ) : (
            /* Normal selection state */
            <>
              {/* Count badge */}
              <span
                className="text-[12px] font-bold px-2.5 py-1 rounded-full"
                style={{ background: 'rgba(139,92,255,.3)', color: '#c4b5fd' }}
              >
                {selectedCount} selected
              </span>

              <button
                onClick={toggleSelectAll}
                className="text-[12px] font-medium"
                style={{ color: 'rgba(255,255,255,.5)' }}
              >
                {allSelected ? 'Deselect all' : `Select all ${filtered.length}`}
              </button>
              <button
                onClick={() => setSelectedPhotos(new Set())}
                className="text-[12px] font-medium"
                style={{ color: 'rgba(255,255,255,.35)' }}
              >
                ✕ Clear
              </button>

              <div className="flex-1" />

              {/* Actions */}
              <button
                onClick={runExport}
                disabled={bulkRunning === 'export'}
                className="px-4 py-2 rounded-[9px] text-[13px] font-semibold disabled:opacity-50"
                style={{ background: 'rgba(139,92,255,.22)', color: '#c4b5fd' }}
              >
                {bulkRunning === 'export' ? 'Exporting…' : 'Export ZIP'}
              </button>
              <button
                onClick={() => setConfirmDelete('bulk')}
                disabled={bulkRunning === 'delete'}
                className="px-4 py-2 rounded-[9px] text-[13px] font-semibold disabled:opacity-50"
                style={{ background: 'rgba(224,92,92,.18)', color: '#f87171' }}
              >
                Delete
              </button>
            </>
          )}
          </div>
        </div>
      )}
    </div>
  );
}
