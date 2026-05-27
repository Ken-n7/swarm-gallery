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
              <div className="text-sm" style={{ color: 'var(--muted)' }}>Today · {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</div>
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
  const chartHeight = 120;
  const chartWidth = 400;
  const leftPad = 18;
  const rightPad = 18;
  const topPad = 14;
  const bottomPad = 28;
  const usableWidth = chartWidth - leftPad - rightPad;
  const usableHeight = chartHeight - topPad - bottomPad;

  const points = data.map((d, i) => {
    const x = leftPad + (usableWidth * i) / Math.max(data.length - 1, 1);
    const y = topPad + usableHeight - (d.uploads / maxUploads) * usableHeight;
    return { ...d, x, y };
  });

  const linePath = points
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`)
    .join(' ');

  const areaPath = `${linePath} L ${points[points.length - 1].x} ${chartHeight - bottomPad} L ${points[0].x} ${chartHeight - bottomPad} Z`;

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-28">
        {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
          const y = topPad + usableHeight - usableHeight * ratio;
          return (
            <line
              key={ratio}
              x1={leftPad}
              x2={chartWidth - rightPad}
              y1={y}
              y2={y}
              stroke="rgba(139,148,178,.14)"
              strokeWidth="1"
              strokeDasharray={ratio === 0 ? undefined : '3 4'}
            />
          );
        })}

        <path d={areaPath} fill="url(#violetArea)" />
        <path
          d={linePath}
          fill="none"
          stroke="url(#violetGradient)"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {points.map((point, index) => {
          const isPeak = index === peakIndex;

          return (
            <g key={point.hour}>
              <circle
                cx={point.x}
                cy={point.y}
                r={isPeak ? 4.5 : 3.5}
                fill={isPeak ? '#8b5cff' : '#fff'}
                stroke="#8b5cff"
                strokeWidth={isPeak ? 2.5 : 2}
              />
              <text
                x={point.x}
                y={chartHeight - 8}
                textAnchor="middle"
                fontSize="10"
                fill="var(--muted)"
              >
                {point.hour}
              </text>
            </g>
          );
        })}

        <defs>
          <linearGradient id="violetGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#8b5cff" />
            <stop offset="100%" stopColor="#c8b5ff" />
          </linearGradient>
          <linearGradient id="violetArea" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="rgba(139,92,255,.24)" />
            <stop offset="100%" stopColor="rgba(139,92,255,0)" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
}
