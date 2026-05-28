'use client';

import { useEffect, useState } from 'react';
import { deleteAdminGuestPhotos, exportAdminGuestAlbum, exportAdminGuests, getAllGuests, getAllPhotos } from '@/lib/api';
import { AdminImage, DestructiveNote, GuestAvatar, SearchIcon, StatusBadge, type AdminGuest, type AdminPhoto, type GuestStatus } from '@/components/Admin/shared/AdminShared';

export function AdminGuests() {
  const [guests, setGuests] = useState<AdminGuest[]>([]);
  const [selectedGuest, setSelectedGuest] = useState<AdminGuest | null>(null);
  const [guestPhotos, setGuestPhotos] = useState<AdminPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('All guests');
  const [query, setQuery] = useState('');
  const [guestNotice, setGuestNotice] = useState<{ tone: 'success' | 'warning'; message: string } | null>(null);
  const [confirmAction, setConfirmAction] = useState<'removePhotos' | null>(null);
  const [actionState, setActionState] = useState<Record<'exportGuests' | 'downloadAlbum' | 'removePhotos' | 'viewPhotos', 'idle' | 'running' | 'success'>>({
    exportGuests: 'idle',
    downloadAlbum: 'idle',
    removePhotos: 'idle',
    viewPhotos: 'idle',
  });

  useEffect(() => {
    let cancelled = false;

    const refreshGuests = () => {
      Promise.all([getAllGuests(), getAllPhotos()])
        .then(([guestData, photoData]) => {
          if (cancelled) return;
          setGuests(guestData);
          setGuestPhotos(photoData);
          setSelectedGuest((current) => {
            if (!guestData.length) return null;
            if (!current) return guestData[0];
            return guestData.find((guest) => guest.id === current.id) || guestData[0];
          });
          setLoading(false);
        })
        .catch(() => {
          if (!cancelled) setLoading(false);
        });
    };

    refreshGuests();
    const intervalId = window.setInterval(refreshGuests, 5000);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, []);

  if (loading) {
    return <div className="p-6 text-center" style={{ color: 'var(--muted)' }}>Loading guests...</div>;
  }

  const enrichedGuests = guests.map((guest) => ({
    ...guest,
    status: (guest.status ?? 'Left event') as GuestStatus,
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
    action: 'exportGuests' | 'downloadAlbum' | 'removePhotos' | 'viewPhotos',
    next: 'idle' | 'running' | 'success'
  ) => setActionState((current) => ({ ...current, [action]: next }));

  const runGuestAction = (
    action: 'exportGuests' | 'downloadAlbum' | 'removePhotos' | 'viewPhotos'
  ) => {
    setGuestActionState(action, 'running');
    setConfirmAction(null);

    if (action === 'exportGuests') {
      window.open(exportAdminGuests({ eventId: 'demo', guestIds: filteredGuests.map((guest) => guest.id) }), '_blank', 'noopener,noreferrer');
      window.setTimeout(() => {
        setGuestNotice({
          tone: 'success',
          message: `${filteredGuests.length} guest${filteredGuests.length === 1 ? '' : 's'} exported from the current filtered view.`,
        });
        setGuestActionState(action, 'success');
      }, 300);
      return;
    }

    if (action === 'downloadAlbum' && selected) {
      window.open(exportAdminGuestAlbum({ eventId: 'demo', guestId: selected.id }), '_blank', 'noopener,noreferrer');
      window.setTimeout(() => {
        setGuestNotice({
          tone: 'success',
          message: `${selected.username}'s album prepared with ${selectedGuestAllPhotos.length} photo${selectedGuestAllPhotos.length === 1 ? '' : 's'}.`,
        });
        setGuestActionState(action, 'success');
      }, 300);
      return;
    }

    if (action === 'viewPhotos' && selected) {
      window.setTimeout(() => {
        setGuestNotice({
          tone: 'success',
          message: `Showing ${selectedGuestAllPhotos.length} photo${selectedGuestAllPhotos.length === 1 ? '' : 's'} available for ${selected.username}.`,
        });
        setGuestActionState(action, 'success');
      }, 250);
      return;
    }

    if (action === 'removePhotos' && selected) {
      deleteAdminGuestPhotos({ eventId: 'demo', guestId: selected.id })
        .then((data) => {
          setGuests(data.guests);
          setGuestPhotos(data.photos);
          setSelectedGuest((current) => {
            if (!current) return current;
            const updatedGuest = data.guests.find((guest) => guest.id === current.id);
            return updatedGuest || null;
          });
          setGuestNotice({
            tone: 'warning',
            message: `Removed ${data.deletedCount} photo${data.deletedCount === 1 ? '' : 's'} from ${selected.username} on the server.`,
          });
          setGuestActionState(action, 'success');
        })
        .catch(() => {
          setGuestNotice({ tone: 'warning', message: 'Could not remove this guest’s photos. Please retry.' });
          setGuestActionState(action, 'idle');
        });
      return;
    }
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
        <div className="rounded-[16px] flex flex-col min-h-[520px]" style={{ background: 'var(--bg)', border: '1px solid var(--line)' }}>
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
                <GuestAvatar guest={guest} size="sm" />
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
              <button onClick={() => runGuestAction('exportGuests')} disabled={filteredGuests.length === 0 || actionState.exportGuests === 'running'} className="px-3 py-2 rounded-[9px] text-[12px] text-left font-medium disabled:opacity-50" style={{ border: '1px solid var(--line)', color: 'var(--ink-soft)', background: 'var(--bg-soft)'}}>
                {actionState.exportGuests === 'running' ? 'Preparing export...' : 'Export guest list'}
              </button>
            </div>
          </div>
        </div>

        <div className="rounded-[16px] overflow-hidden" style={{ background: 'var(--bg-deep)', border: '1px solid var(--line)' }}>
          {selected ? (
            <div className="p-5 flex flex-col gap-3">
              <div className="rounded-[14px] p-5 flex flex-wrap items-center gap-4" style={{ background: 'var(--bg)', border: '1px solid var(--line)' }}>
                <GuestAvatar guest={selected} size="md" />
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
                <div className="rounded-[14px] p-5" style={{ background: 'var(--bg)', border: '1px solid var(--line)' }}>
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

                <div className="rounded-[14px] p-5" style={{ background: 'var(--bg)', border: '1px solid var(--line)' }}>
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

              <div className="rounded-[14px] p-5" style={{ background: 'var(--bg)', border: '1px solid var(--line)' }}>
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
                        <div className="text-[12px] font-medium" style={{ color: 'var(--danger)' }}>Remove {selectedGuestAllPhotos.length} photo{selectedGuestAllPhotos.length === 1 ? '' : 's'} from {selected.username} on the server?</div>
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

        <div className="rounded-[16px] px-4 py-4 xl:min-h-[520px]" style={{ background: 'var(--bg)', border: '1px solid var(--line)' }}>
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
