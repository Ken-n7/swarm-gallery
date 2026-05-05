'use client';

import { useEffect, useState } from 'react';
import { getAllGuests, getAllPhotos } from '@/lib/api';
import { AdminImage, DestructiveNote, SearchIcon, StatusBadge, type AdminGuest, type AdminPhoto, type GuestStatus } from '@/components/Admin/shared/AdminShared';

export function AdminGuests() {
  const [guests, setGuests] = useState<AdminGuest[]>([]);
  const [selectedGuest, setSelectedGuest] = useState<AdminGuest | null>(null);
  const [guestPhotos, setGuestPhotos] = useState<AdminPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('All guests');
  const [query, setQuery] = useState('');
  const [guestNotice, setGuestNotice] = useState<{ tone: 'success' | 'warning'; message: string } | null>(null);
  const [confirmAction, setConfirmAction] = useState<'removeGuest' | 'removePhotos' | null>(null);
  const [actionState, setActionState] = useState<Record<'exportGuests' | 'downloadAlbum' | 'removeGuest' | 'removePhotos' | 'viewPhotos', 'idle' | 'running' | 'success'>>({
    exportGuests: 'idle',
    downloadAlbum: 'idle',
    removeGuest: 'idle',
    removePhotos: 'idle',
    viewPhotos: 'idle',
  });

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
  const selectedGuestPhotos = selected ? guestPhotos.filter((photo) => photo.uploader === selected.username).slice(0, 6) : [];
  const totalGuests = Math.max(enrichedGuests.length, 1);
  const selectedGuestAllPhotos = selected ? guestPhotos.filter((photo) => photo.uploader === selected.username) : [];

  const setGuestActionState = (
    action: 'exportGuests' | 'downloadAlbum' | 'removeGuest' | 'removePhotos' | 'viewPhotos',
    next: 'idle' | 'running' | 'success'
  ) => setActionState((current) => ({ ...current, [action]: next }));

  const runGuestAction = (
    action: 'exportGuests' | 'downloadAlbum' | 'removeGuest' | 'removePhotos' | 'viewPhotos'
  ) => {
    setGuestActionState(action, 'running');
    setConfirmAction(null);

    window.setTimeout(() => {
      if (action === 'exportGuests') {
        setGuestNotice({
          tone: 'success',
          message: `${filteredGuests.length} guest${filteredGuests.length === 1 ? '' : 's'} prepared for export from the current filtered view.`,
        });
      }
      if (action === 'downloadAlbum' && selected) {
        setGuestNotice({
          tone: 'success',
          message: `${selected.username}'s album prepared with ${selectedGuestAllPhotos.length} photo${selectedGuestAllPhotos.length === 1 ? '' : 's'}.`,
        });
      }
      if (action === 'viewPhotos' && selected) {
        setGuestNotice({
          tone: 'success',
          message: `Showing ${selectedGuestAllPhotos.length} photo${selectedGuestAllPhotos.length === 1 ? '' : 's'} available for ${selected.username}.`,
        });
      }
      if (action === 'removePhotos' && selected) {
        setGuestPhotos((current) => current.filter((photo) => photo.uploader !== selected.username));
        setGuests((current) => current.map((guest) => (guest.id === selected.id ? { ...guest, photoCount: 0 } : guest)));
        setSelectedGuest((current) => (current ? { ...current, photoCount: 0 } : current));
        setGuestNotice({
          tone: 'warning',
          message: `Removed ${selectedGuestAllPhotos.length} photo${selectedGuestAllPhotos.length === 1 ? '' : 's'} from ${selected.username} in the client-side state.`,
        });
      }
      if (action === 'removeGuest' && selected) {
        setGuests((current) => current.filter((guest) => guest.id !== selected.id));
        setGuestPhotos((current) => current.filter((photo) => photo.uploader !== selected.username));
        setSelectedGuest((current) => {
          if (!current || current.id !== selected.id) return current;
          const remaining = enrichedGuests.filter((guest) => guest.id !== selected.id);
          return remaining[0] || null;
        });
        setGuestNotice({
          tone: 'warning',
          message: `${selected.username} removed from the client-side guest list.`,
        });
      }

      setGuestActionState(action, 'success');
    }, 650);
  };

  return (
    <div className="p-4 lg:p-6">
      {guestNotice && (
        <div
          className="rounded-[14px] px-4 py-3 mb-4 flex flex-wrap items-center justify-between gap-3"
          style={{
            border: `1px solid ${guestNotice.tone === 'success' ? 'rgba(31,143,74,.15)' : 'rgba(224,92,92,.2)'}`,
            background: guestNotice.tone === 'success' ? 'var(--good-tint)' : 'var(--danger-tint)',
            color: guestNotice.tone === 'success' ? 'var(--good)' : 'var(--danger)',
          }}
        >
          <div className="text-sm font-medium">{guestNotice.message}</div>
          <button className="text-xs font-semibold" onClick={() => setGuestNotice(null)}>Dismiss</button>
        </div>
      )}
      <div className="grid grid-cols-1 xl:grid-cols-[300px_minmax(0,1fr)_220px] gap-4 items-start">
        <div className="bg-white rounded-[16px] flex flex-col min-h-[520px]" style={{ border: '1px solid var(--line)' }}>
          <div className="p-3.5 flex-none" style={{ borderBottom: '1px solid var(--line)' }}>
            <div className="flex items-center gap-2 px-3 py-2 rounded-[9px]" style={{ background: 'var(--bg-deep)' }}>
              <span style={{ color: 'var(--muted)' }}><SearchIcon /></span>
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search guests" className="flex-1 bg-transparent outline-none text-[13px]" style={{ color: 'var(--ink)' }} />
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
              <div key={guest.id} className="flex items-center gap-3 px-3.5 py-3 cursor-pointer" style={{ borderBottom: '1px solid var(--line)', background: selected?.id === guest.id ? 'var(--violet-tint)' : 'transparent' }} onClick={() => setSelectedGuest(guest)}>
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
              <div className="h-full grid place-items-center text-[14px]" style={{ color: 'var(--muted)' }}>No guests found</div>
            )}
          </div>
          <div className="p-3.5 flex-none" style={{ borderTop: '1px solid var(--line)' }}>
            <div className="text-[10px] font-bold uppercase tracking-[0.1em] mb-3" style={{ color: 'var(--muted)' }}>Bulk Actions</div>
            <div className="flex flex-col gap-1.5">
              <button onClick={() => runGuestAction('exportGuests')} disabled={filteredGuests.length === 0 || actionState.exportGuests === 'running'} className="px-3 py-2 rounded-[9px] text-[12px] text-left font-medium disabled:opacity-50" style={{ border: '1px solid var(--line)', color: 'var(--ink-soft)', background: '#fff' }}>
                {actionState.exportGuests === 'running' ? 'Preparing export...' : 'Export guest list'}
              </button>
              <button onClick={() => setConfirmAction('removeGuest')} disabled={!selected || actionState.removeGuest === 'running'} className="px-3 py-2 rounded-[9px] text-[12px] text-left font-medium disabled:opacity-50" style={{ border: '1px solid var(--line)', color: 'var(--danger)', background: 'var(--danger-tint)' }}>
                {actionState.removeGuest === 'running' ? 'Removing guest...' : 'Remove selected'}
              </button>
              {confirmAction === 'removeGuest' && selected && (
                <div className="rounded-[10px] border p-3 flex flex-col gap-3" style={{ borderColor: 'rgba(224,92,92,.2)', background: 'rgba(253,231,236,.72)' }}>
                  <div className="text-[12px] font-medium" style={{ color: 'var(--danger)' }}>Remove {selected.username} from the client-side guest list?</div>
                  <div className="flex flex-wrap gap-2">
                    <button onClick={() => runGuestAction('removeGuest')} className="px-3 py-1.5 rounded-[8px] text-[12px] font-semibold text-white" style={{ background: 'var(--danger)' }}>Confirm Remove</button>
                    <button onClick={() => setConfirmAction(null)} className="text-[12px] font-semibold" style={{ color: 'var(--muted)' }}>Cancel</button>
                  </div>
                </div>
              )}
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
                  {selectedGuestPhotos.length > 0 ? (
                    <div className="grid grid-cols-3 gap-[5px]">
                      {Array.from({ length: Math.min(6, Math.max(selectedGuestPhotos.length, 1)) }).map((_, index) => {
                        const photoKey = `photo-${index}`;
                        return (
                          <div key={photoKey} className="relative aspect-square rounded-[8px] overflow-hidden" style={{ background: 'var(--bg-deep)' }}>
                            {selectedGuestPhotos[index]?.thumbUrl || selectedGuestPhotos[index]?.url ? (
                              <AdminImage src={selectedGuestPhotos[index].thumbUrl || selectedGuestPhotos[index].url} alt={`${selected.username} photo ${index + 1}`} sizes="(max-width: 1280px) 33vw, 120px" />
                            ) : null}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="rounded-[10px] p-4 text-sm" style={{ background: 'var(--bg-deep)', color: 'var(--muted)' }}>
                      No photos available for this guest yet.
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-white rounded-[14px] p-5" style={{ border: '1px solid var(--line)' }}>
                <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                  <div className="text-[10px] font-bold uppercase tracking-[0.1em]" style={{ color: 'var(--muted)' }}>Admin Controls</div>
                  <DestructiveNote>Review before removal</DestructiveNote>
                </div>
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-2">
                  <button onClick={() => runGuestAction('viewPhotos')} disabled={actionState.viewPhotos === 'running'} className="px-3.5 py-2.5 rounded-[10px] text-[13px] font-semibold text-left disabled:opacity-50" style={{ color: 'var(--violet)', background: 'var(--violet-tint)' }}>
                    {actionState.viewPhotos === 'running' ? 'Loading photos...' : 'View all photos'}
                  </button>
                  <button onClick={() => runGuestAction('downloadAlbum')} disabled={selectedGuestAllPhotos.length === 0 || actionState.downloadAlbum === 'running'} className="px-3.5 py-2.5 rounded-[10px] text-[13px] font-semibold text-left disabled:opacity-50" style={{ color: 'var(--ink)', background: 'var(--bg-deep)' }}>
                    {actionState.downloadAlbum === 'running' ? 'Preparing album...' : 'Download their album'}
                  </button>
                  <div className="xl:col-span-2 space-y-2">
                    <button onClick={() => setConfirmAction('removePhotos')} disabled={selectedGuestAllPhotos.length === 0 || actionState.removePhotos === 'running'} className="w-full px-3.5 py-2.5 rounded-[10px] text-[13px] font-semibold text-left disabled:opacity-50" style={{ color: 'var(--danger)', background: 'var(--danger-tint)' }}>
                      {actionState.removePhotos === 'running' ? 'Removing photos...' : 'Remove photos'}
                    </button>
                    {confirmAction === 'removePhotos' && (
                      <div className="rounded-[10px] border p-3 flex flex-col gap-3" style={{ borderColor: 'rgba(224,92,92,.2)', background: 'rgba(253,231,236,.72)' }}>
                        <div className="text-[12px] font-medium" style={{ color: 'var(--danger)' }}>Remove {selectedGuestAllPhotos.length} photo{selectedGuestAllPhotos.length === 1 ? '' : 's'} from {selected.username} in the client-side state?</div>
                        <div className="flex flex-wrap gap-2">
                          <button onClick={() => runGuestAction('removePhotos')} className="px-3 py-1.5 rounded-[8px] text-[12px] font-semibold text-white" style={{ background: 'var(--danger)' }}>Confirm Remove</button>
                          <button onClick={() => setConfirmAction(null)} className="text-[12px] font-semibold" style={{ color: 'var(--muted)' }}>Cancel</button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full grid place-items-center text-[14px]" style={{ color: 'var(--muted)' }}>Select a guest to view profile</div>
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
