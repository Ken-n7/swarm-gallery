'use client';

import { useEffect, useState } from 'react';
import { getAdminStats, getRecentGuests, getRecentPhotos } from '@/lib/api';
import { AdminImage, type AdminGuest, type AdminPhoto, type AdminStats, type GuestStatus, StatCard, StatusBadge } from '@/components/Admin/shared/AdminShared';

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
        <div className="rounded-[14px] p-6 animate-pulse bg-white" style={{ border: '1px solid var(--line)' }}>
          <div className="h-4 w-40 rounded-full mb-3" style={{ background: 'var(--bg-deep)' }} />
          <div className="h-3 w-28 rounded-full mb-6" style={{ background: 'var(--bg-deep)' }} />
          <div className="h-24 rounded-[12px]" style={{ background: 'var(--bg-deep)' }} />
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

        <div className="rounded-[14px] p-8 bg-white text-center" style={{ border: '1px solid var(--line)' }}>
          <div className="text-[18px] font-semibold mb-2" style={{ color: 'var(--ink)' }}>This event is ready for guests</div>
          <div className="text-sm max-w-xl mx-auto" style={{ color: 'var(--muted)' }}>
            No guests or media have been added yet. Once people join and upload, this dashboard will start showing recent activity, guest counts, and gallery snapshots.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Photos" value={stats?.photoCount || 0} />
        <StatCard title="Total Guests" value={stats?.guestCount || 0} />
        <StatCard title="Active Guests" value={stats?.activeGuests || 0} />
        <StatCard title="Temp Storage" value={`${stats?.storageUsed || 0} MB`} />
      </div>

      <div className="grid grid-cols-1 gap-6">
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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

        <div className="bg-white rounded-[14px] overflow-hidden" style={{ border: '1px solid var(--line)' }}>
          <div className="px-[18px] py-[14px] flex items-center justify-between" style={{ borderBottom: '1px solid var(--line)' }}>
            <h3 className="text-[17px] font-semibold" style={{ color: 'var(--ink)' }}>Recent Guests</h3>
            <button className="text-sm" style={{ color: 'var(--violet)' }}>View all →</button>
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
                      <div><button className="text-[12px] font-semibold" style={{ color: 'var(--violet)' }}>View →</button></div>
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
    </div>
  );
}

function UploadTimelineChart() {
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

  const maxUploads = Math.max(...data.map((d) => d.uploads));
  const peakIndex = data.findIndex((d) => d.uploads === maxUploads);

  return (
    <div className="relative">
      <svg viewBox="0 0 400 120" className="w-full h-24">
        {data.map((d, i) => {
          const barHeight = (d.uploads / maxUploads) * 80;
          const x = i * 40;
          const y = 100 - barHeight;
          const isPeak = i === peakIndex;

          return (
            <g key={d.hour}>
              <rect
                x={x + 8}
                y={y}
                width="24"
                height={barHeight}
                rx="6"
                fill={isPeak ? 'url(#violetGradient)' : 'rgba(139,92,255,.18)'}
              />
              <text x={x + 20} y="115" textAnchor="middle" fontSize="10" fill="var(--muted)">
                {d.hour}
              </text>
            </g>
          );
        })}
        <defs>
          <linearGradient id="violetGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#8b5cff" />
            <stop offset="100%" stopColor="#c8b5ff" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
}
