'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { getAdminStats, getRecentGuests, getRecentPhotos, SERVER } from '@/lib/api';
import { AdminImage, type AdminGuest, type AdminPhoto, type AdminStats, type GuestStatus, StatCard, StatusBadge } from '@/components/Admin/shared/AdminShared';

function QRCard() {
  const qrUrl = `${SERVER}/events/demo/qr`;
  const [joinUrl, setJoinUrl] = useState('');

  useEffect(() => {
    setJoinUrl(`${window.location.origin}/event/demo`);
  }, []);

  return (
    <div className="bg-white rounded-[14px] p-6 flex flex-col gap-5" style={{ border: '1px solid var(--line)' }}>
      <div className="flex items-center justify-between">
        <h3 className="text-[17px] font-semibold" style={{ color: 'var(--ink)' }}>Event QR Code</h3>
        <span className="px-3 py-1 rounded-full text-xs font-semibold" style={{ background: 'var(--good-tint)', color: 'var(--good)' }}>
          Accepting guests
        </span>
      </div>

      <div className="flex justify-center">
        <div className="relative w-44 h-44 rounded-[14px] overflow-hidden p-3 border" style={{ borderColor: 'var(--line)' }}>
          <Image src={qrUrl} alt="Event QR code" fill unoptimized sizes="176px" className="object-contain p-2" />
        </div>
      </div>

      <div className="rounded-[10px] px-4 py-3 text-[12px] break-all" style={{ background: 'var(--bg-deep)', color: 'var(--ink-soft)' }}>
        <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: 'var(--muted)' }}>Join link</p>
        {joinUrl || 'Loading…'}
      </div>

      <a
        href={qrUrl}
        download="event-qr.png"
        target="_blank"
        rel="noreferrer"
        className="w-full py-2.5 rounded-[10px] text-[13px] font-semibold text-center flex items-center justify-center gap-2"
        style={{ background: 'var(--violet-tint)', color: 'var(--violet-dark)' }}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
        </svg>
        Download QR
      </a>
    </div>
  );
}

export function AdminDashboard() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [recentPhotos, setRecentPhotos] = useState<AdminPhoto[]>([]);
  const [recentGuests, setRecentGuests] = useState<AdminGuest[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const refreshDashboard = () => {
      Promise.all([
        getAdminStats(),
        getRecentPhotos('demo', 6),
        getRecentGuests('demo', 5),
      ])
        .then(([statsData, photosData, guestsData]) => {
          if (cancelled) return;
          setStats(statsData);
          setRecentPhotos(photosData);
          setRecentGuests(guestsData);
          setLoadFailed(false);
          setLoading(false);
        })
        .catch(() => {
          if (!cancelled) {
            setLoadFailed(true);
            setLoading(false);
          }
        });
    };

    refreshDashboard();
    const intervalId = window.setInterval(refreshDashboard, 5000);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, []);

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="rounded-[14px] p-6 animate-pulse bg-white" style={{ border: '1px solid var(--line)' }}>
              <div className="h-3 w-24 rounded-full mb-4" style={{ background: 'var(--bg-deep)' }} />
              <div className="h-8 w-20 rounded-full" style={{ background: 'var(--bg-deep)' }} />
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="rounded-[14px] p-6 animate-pulse bg-white" style={{ border: '1px solid var(--line)' }}>
            <div className="h-4 w-32 rounded-full mb-4" style={{ background: 'var(--bg-deep)' }} />
            <div className="mx-auto w-44 h-44 rounded-[14px]" style={{ background: 'var(--bg-deep)' }} />
          </div>
          <div className="rounded-[14px] p-6 animate-pulse bg-white" style={{ border: '1px solid var(--line)' }}>
            <div className="h-4 w-32 rounded-full mb-4" style={{ background: 'var(--bg-deep)' }} />
            <div className="grid grid-cols-3 gap-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="aspect-square rounded-[12px]" style={{ background: 'var(--bg-deep)' }} />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (loadFailed) {
    return (
      <div className="p-6">
        <div className="rounded-[14px] p-6 bg-white" style={{ border: '1px solid rgba(224,92,92,.2)' }}>
          <div className="text-[18px] font-semibold mb-2" style={{ color: 'var(--danger)' }}>Dashboard unavailable</div>
          <div className="text-sm" style={{ color: 'var(--ink-soft)' }}>
            Admin metrics could not be loaded from the server. Refresh the page or check that the server is still reachable.
          </div>
        </div>
      </div>
    );
  }

  const guestStatuses: GuestStatus[] = ['Active', 'Active', 'Active', 'Active', 'Idle'];
  const topUploader = [...recentGuests].sort((a, b) => (b.photoCount || 0) - (a.photoCount || 0))[0];
  const hasActivity = (stats?.photoCount || 0) > 0 || (stats?.guestCount || 0) > 0;

  if (!hasActivity) {
    return (
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Total Photos" value={0} />
          <StatCard title="Total Guests" value={0} />
          <StatCard title="Active Guests" value={0} />
          <StatCard title="Temp Storage" value="0 MB" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <QRCard />
          <div className="rounded-[14px] p-8 bg-white flex flex-col items-center justify-center text-center" style={{ border: '1px solid var(--line)' }}>
            <div className="text-[18px] font-semibold mb-2" style={{ color: 'var(--ink)' }}>Ready for guests</div>
            <div className="text-sm max-w-xs" style={{ color: 'var(--muted)' }}>
              Share the QR code so guests can join. Activity, uploads, and recent guests will appear here once people start joining.
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Stat cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Photos" value={stats?.photoCount || 0} />
        <StatCard title="Total Guests" value={stats?.guestCount || 0} />
        <StatCard title="Active Guests" value={stats?.activeGuests || 0} />
        <StatCard title="Temp Storage" value={`${stats?.storageUsed || 0} MB`} />
      </div>

      {/* QR code + Recent Photos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <QRCard />

        <div className="bg-white rounded-[14px] p-6" style={{ border: '1px solid var(--line)' }}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[17px] font-semibold" style={{ color: 'var(--ink)' }}>Recent Photos</h3>
            <span className="text-sm font-medium" style={{ color: 'var(--muted)' }}>Latest uploads</span>
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
      </div>

      {/* Recent Guests */}
      <div className="bg-white rounded-[14px] overflow-hidden" style={{ border: '1px solid var(--line)' }}>
        <div className="px-[18px] py-[14px] flex items-center justify-between" style={{ borderBottom: '1px solid var(--line)' }}>
          <h3 className="text-[17px] font-semibold" style={{ color: 'var(--ink)' }}>Recent Guests</h3>
          <span className="text-sm font-medium" style={{ color: 'var(--muted)' }}>Latest joins</span>
        </div>
        {recentGuests.length > 0 ? (
          <>
            <div className="hidden xl:grid grid-cols-[1.9fr_1fr_.8fr_.9fr_.6fr] px-[18px] py-[9px]" style={{ background: 'var(--bg-deep)' }}>
              {['Guest', 'Joined', 'Photos', 'Status', ''].map((label) => (
                <div key={label} className="text-[10px] font-bold uppercase tracking-[0.08em]" style={{ color: 'var(--muted)' }}>
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
                        <div className="text-[11px]" style={{ color: 'var(--muted)' }}>{index + 2}m ago</div>
                      </div>
                    </div>
                    <div className="text-[12px]" style={{ color: 'var(--muted)' }}>{new Date(guest.joinedAt).toLocaleDateString()}</div>
                    <div className="text-[13px] font-semibold" style={{ color: 'var(--ink)' }}>{guest.photoCount}</div>
                    <div><StatusBadge status={status} /></div>
                    <div className="text-[11px] font-semibold" style={{ color: 'var(--muted)' }}>Summary</div>
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
                    <div className="text-[12px] font-semibold" style={{ color: 'var(--muted)' }}>Summary</div>
                  </div>
                </div>
              );
            })}
            {topUploader && (
              <div className="px-[18px] py-3 flex flex-wrap items-center gap-3" style={{ borderTop: '1px solid var(--line)', background: 'var(--violet-tint)' }}>
                <div className="text-[12px] font-bold" style={{ color: 'var(--violet-dark)' }}>
                  Top uploader: <span style={{ color: 'var(--violet)' }}>{topUploader.username}</span>
                </div>
                <div className="text-[12px]" style={{ color: 'var(--muted)' }}>{topUploader.photoCount} photos</div>
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
  );
}
