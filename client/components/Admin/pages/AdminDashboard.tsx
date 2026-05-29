'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { getAdminStats, getNetworkInfo, getRecentGuests, getRecentPhotos, SERVER } from '@/lib/api';
import { AdminImage, GuestAvatar, type AdminGuest, type AdminPhoto, type AdminStats, type GuestStatus, StatCard, StatusBadge } from '@/components/Admin/shared/AdminShared';

type SyncStatus = 'idle' | 'syncing' | 'ok' | 'error';

function NetworkCard({ onIpDetected }: { onIpDetected?: (ip: string) => void }) {
  const [ips, setIps] = useState<string[]>([]);
  const [status, setStatus] = useState<SyncStatus>('syncing');
  const [copied, setCopied] = useState(false);
  const [log, setLog] = useState('Detecting network…');
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  const guestUrl = ips[0] ? `http://${ips[0]}:3000/event/demo` : null;

  function resync() {
    setStatus('syncing');
    setLog('Detecting network…');
    getNetworkInfo()
      .then(({ ips: detected }) => {
        setLastChecked(new Date());
        if (!detected.length) {
          setStatus('error');
          setLog('No network found. Connect to Wi-Fi or a router first.');
        } else {
          setIps(detected);
          setStatus('ok');
          setLog(`Network ready. Guest link is live.`);
          if (detected[0]) onIpDetected?.(detected[0]);
        }
      })
      .catch(() => {
        setLastChecked(new Date());
        setStatus('error');
        setLog('Could not reach the server. Is it still running?');
      });
  }

  // Auto-scan on mount and every 10 seconds
  useEffect(() => {
    resync();
    const id = window.setInterval(resync, 10_000);
    return () => window.clearInterval(id);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function copyLink() {
    if (!guestUrl) return;
    navigator.clipboard.writeText(guestUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  const dotColor =
    status === 'ok' ? 'var(--good)' :
    status === 'error' ? 'var(--danger)' :
    status === 'syncing' ? '#f59e0b' :
    'var(--muted)';

  return (
    <div className="rounded-[14px] p-6 flex flex-col gap-4" style={{ background: 'var(--bg)', border: '1px solid var(--line)' }}>
      <div className="flex items-center justify-between">
        <h3 className="text-[17px] font-semibold" style={{ color: 'var(--ink)' }}>Network</h3>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ background: dotColor, transition: 'background .3s' }} />
          <span className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: dotColor }}>
            {status === 'idle' ? 'Not checked' : status === 'syncing' ? 'Checking…' : status === 'ok' ? 'Connected' : 'Error'}
          </span>
        </div>
      </div>

      {/* Log message */}
      <div className="rounded-[10px] px-4 py-3 text-[12px]" style={{ background: 'var(--bg-deep)', color: 'var(--ink-soft)', minHeight: '48px' }}>
        <p>{log}</p>
        {lastChecked && (
          <p className="mt-1 text-[10px]" style={{ color: 'var(--muted)' }}>
            Last checked {lastChecked.toLocaleTimeString()}
          </p>
        )}
      </div>

      {/* Detected IPs */}
      {ips.length > 0 && (
        <div className="flex flex-col gap-1.5">
          {ips.map((ip) => (
            <div key={ip} className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: 'var(--good)' }} />
              <span className="text-[13px] font-mono" style={{ color: 'var(--ink)' }}>{ip}</span>
            </div>
          ))}
        </div>
      )}

      {/* Guest link + copy */}
      {guestUrl && (
        <div className="rounded-[10px] px-4 py-3" style={{ background: 'var(--bg-deep)' }}>
          <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: 'var(--muted)' }}>Guest link</p>
          <p className="text-[12px] break-all" style={{ color: 'var(--ink-soft)' }}>{guestUrl}</p>
        </div>
      )}

      {/* Buttons */}
      <div className="flex gap-2">
        <button
          onClick={resync}
          disabled={status === 'syncing'}
          className="flex-1 py-2.5 rounded-[10px] text-[13px] font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
          style={{ background: 'var(--violet-tint)', color: 'var(--violet-dark)' }}
        >
          <svg className={`w-4 h-4 ${status === 'syncing' ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          {status === 'syncing' ? 'Checking…' : 'Refresh'}
        </button>

        {guestUrl && (
          <button
            onClick={copyLink}
            className="flex-1 py-2.5 rounded-[10px] text-[13px] font-semibold flex items-center justify-center gap-2"
            style={{ background: copied ? 'var(--good-tint)' : 'var(--bg-deep)', color: copied ? 'var(--good)' : 'var(--ink-soft)', border: '1px solid var(--line)' }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {copied
                ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              }
            </svg>
            {copied ? 'Copied!' : 'Copy link'}
          </button>
        )}
      </div>
    </div>
  );
}

function QRCard({ liveIp }: { liveIp: string }) {
  // Cache-bust the QR image whenever the detected IP changes.
  // The server regenerates the QR from the live IP on every request.
  const qrUrl = `${SERVER}/events/demo/qr?ip=${encodeURIComponent(liveIp || 'unknown')}`;
  const joinUrl = liveIp ? `http://${liveIp}:3000/event/demo` : '';

  return (
    <div className="rounded-[14px] p-6 flex flex-col gap-5" style={{ background: 'var(--bg)', border: '1px solid var(--line)' }}>
      <div className="flex items-center justify-between">
        <h3 className="text-[17px] font-semibold" style={{ color: 'var(--ink)' }}>Event QR Code</h3>
        <span className="px-3 py-1 rounded-full text-xs font-semibold" style={{ background: 'var(--good-tint)', color: 'var(--good)' }}>
          Accepting guests
        </span>
      </div>

      <div className="flex justify-center">
        <div className="relative w-44 h-44 rounded-[14px] overflow-hidden p-3 border" style={{ borderColor: 'var(--line)' }}>
          {liveIp
            ? <Image src={qrUrl} alt="Event QR code" fill unoptimized sizes="176px" className="object-contain p-2" />
            : <div className="w-full h-full flex items-center justify-center text-[11px]" style={{ color: 'var(--muted)' }}>Detecting IP…</div>
          }
        </div>
      </div>

      <div className="rounded-[10px] px-4 py-3 text-[12px] break-all" style={{ background: 'var(--bg-deep)', color: 'var(--ink-soft)' }}>
        <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: 'var(--muted)' }}>Join link</p>
        {joinUrl || 'Detecting network…'}
      </div>

      <a
        href={liveIp ? qrUrl : undefined}
        download="event-qr.png"
        target="_blank"
        rel="noreferrer"
        className="w-full py-2.5 rounded-[10px] text-[13px] font-semibold text-center flex items-center justify-center gap-2"
        style={{ background: 'var(--violet-tint)', color: 'var(--violet-dark)', opacity: liveIp ? 1 : 0.4, pointerEvents: liveIp ? 'auto' : 'none' }}
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
  const [liveIp, setLiveIp] = useState('');

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
            <div key={index} className="rounded-[14px] p-6 animate-pulse" style={{ background: 'var(--bg)', border: '1px solid var(--line)' }}>
              <div className="h-3 w-24 rounded-full mb-4" style={{ background: 'var(--bg-deep)' }} />
              <div className="h-8 w-20 rounded-full" style={{ background: 'var(--bg-deep)' }} />
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="rounded-[14px] p-6 animate-pulse" style={{ background: 'var(--bg)', border: '1px solid var(--line)' }}>
            <div className="h-4 w-32 rounded-full mb-4" style={{ background: 'var(--bg-deep)' }} />
            <div className="mx-auto w-44 h-44 rounded-[14px]" style={{ background: 'var(--bg-deep)' }} />
          </div>
          <div className="rounded-[14px] p-6 animate-pulse" style={{ background: 'var(--bg)', border: '1px solid var(--line)' }}>
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
        <div className="rounded-[14px] p-6" style={{ background: 'var(--bg)', border: '1px solid rgba(224,92,92,.2)' }}>
          <div className="text-[18px] font-semibold mb-2" style={{ color: 'var(--danger)' }}>Dashboard unavailable</div>
          <div className="text-sm" style={{ color: 'var(--ink-soft)' }}>
            Admin metrics could not be loaded from the server. Refresh the page or check that the server is still reachable.
          </div>
        </div>
      </div>
    );
  }

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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <QRCard liveIp={liveIp} />
          <NetworkCard onIpDetected={setLiveIp} />
          <div className="rounded-[14px] p-8 flex flex-col items-center justify-center text-center" style={{ background: 'var(--bg)', border: '1px solid var(--line)' }}>
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

      {/* QR code + Network + Recent Photos */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <QRCard liveIp={liveIp} />
        <NetworkCard />

        <div className="rounded-[14px] p-6" style={{ background: 'var(--bg)', border: '1px solid var(--line)' }}>
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
      <div className="rounded-[14px] overflow-hidden" style={{ background: 'var(--bg)', border: '1px solid var(--line)' }}>
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
              const status = (guest.status as GuestStatus) ?? 'Left event';
              return (
                <div key={guest.id} style={{ borderTop: '1px solid var(--line)' }}>
                  <div className="hidden xl:grid grid-cols-[1.9fr_1fr_.8fr_.9fr_.6fr] px-[18px] py-[11px] items-center">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <GuestAvatar guest={guest} size="sm" />
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
                        <GuestAvatar guest={guest} size="md" />
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
