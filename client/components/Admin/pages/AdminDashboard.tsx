'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { getAdminStats, getNetworkInfo, getRecentGuests, getRecentPhotos, SERVER } from '@/lib/api';
import { AdminImage, GuestAvatar, type AdminGuest, type AdminPhoto, type AdminStats, type GuestStatus, StatCard, StatusBadge } from '@/components/Admin/shared/AdminShared';

type SyncStatus = 'idle' | 'syncing' | 'ok' | 'error';

function timeAgo(ms: number): string {
  const diff = Date.now() - ms;
  const s = Math.floor(diff / 1000);
  if (s < 60)  return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60)  return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24)  return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function NetworkCard({ onIpDetected }: { onIpDetected?: (ip: string) => void }) {
  const [hotspotIp, setHotspotIp] = useState<string | null>(null);
  const [status, setStatus] = useState<SyncStatus>('syncing');
  const [copied, setCopied] = useState(false);
  const [log, setLog] = useState('Detecting network…');
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  // Use the hotspot-preferred liveIp for the guest link, not ips[0] (arbitrary order)
  const guestUrl = hotspotIp ? `http://${hotspotIp}:3000/event/demo` : null;

  function resync() {
    setStatus('syncing');
    setLog('Detecting network…');
    getNetworkInfo()
      .then(({ ips: detected, liveIp }) => {
        setLastChecked(new Date());
        if (!detected.length) {
          setStatus('error');
          setLog('No network found. Connect to Wi-Fi or a router first.');
        } else {
          setHotspotIp(liveIp);
          setStatus('ok');
          setLog(`Network ready. Guest link is live.`);
          if (liveIp) onIpDetected?.(liveIp);
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

function QRCard() {
  const [liveIp, setLiveIp] = useState('');

  useEffect(() => {
    function refresh() {
      getNetworkInfo()
        .then(({ liveIp: ip }) => { if (ip) setLiveIp(ip); })
        .catch(() => {});
    }
    refresh();
    const id = window.setInterval(refresh, 10_000);
    return () => window.clearInterval(id);
  }, []);

  const qrSrc = liveIp
    ? `${SERVER}/events/demo/qr?ip=${encodeURIComponent(liveIp)}`
    : `${SERVER}/events/demo/qr`;
  const joinUrl = liveIp ? `http://${liveIp}:3000/event/demo` : null;

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
          <Image src={qrSrc} alt="Event QR code" fill unoptimized sizes="176px" className="object-contain p-2" />
        </div>
      </div>

      <div className="rounded-[10px] px-4 py-3 text-[12px] break-all" style={{ background: 'var(--bg-deep)', color: 'var(--ink-soft)' }}>
        <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: 'var(--muted)' }}>Join link</p>
        {joinUrl ?? <span style={{ color: 'var(--muted)' }}>Detecting network…</span>}
      </div>

      <a
        href={qrSrc}
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
          <StatCard title="Total Photos" value={0} accent="var(--violet)" icon={<svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" /><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" /></svg>} />
          <StatCard title="Total Guests" value={0} accent="#3b82f6" icon={<svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" /></svg>} />
          <StatCard title="Active Now" value={0} accent="var(--good)" icon={<span className="w-4 h-4 rounded-full block" style={{ background: 'var(--good)' }} />} />
          <StatCard title="Temp Storage" value="0 MB" accent="#f59e0b" icon={<svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75m-16.5-3.75v3.75m16.5 0v3.75C20.25 16.153 16.556 18 12 18s-8.25-1.847-8.25-4.125v-3.75m16.5 0c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125" /></svg>} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <QRCard />
          <NetworkCard />
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

  const now = Date.now();
  const newestGuestId = recentGuests.length > 0
    ? [...recentGuests].sort((a, b) => b.joinedAt - a.joinedAt)[0]?.id
    : null;

  return (
    <div className="p-6 space-y-6">
      {/* Stat cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Photos" value={stats?.photoCount || 0} accent="var(--violet)" icon={
          <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" />
          </svg>
        } />
        <StatCard title="Total Guests" value={stats?.guestCount || 0} accent="#3b82f6" icon={
          <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
          </svg>
        } />
        <StatCard title="Active Now" value={stats?.activeGuests || 0} accent="var(--good)" icon={
          <span className="relative flex w-4 h-4 items-center justify-center">
            <span className="ping-ring absolute inline-flex w-3 h-3 rounded-full" style={{ background: 'var(--good)', opacity: .5 }} />
            <span className="relative w-2.5 h-2.5 rounded-full" style={{ background: 'var(--good)' }} />
          </span>
        } />
        <StatCard title="Temp Storage" value={`${stats?.storageUsed || 0} MB`} accent="#f59e0b" icon={
          <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75m-16.5-3.75v3.75m16.5 0v3.75C20.25 16.153 16.556 18 12 18s-8.25-1.847-8.25-4.125v-3.75m16.5 0c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125" />
          </svg>
        } />
      </div>

      {/* QR code + Network + Recent Photos */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <QRCard />
        <NetworkCard />

        <div className="rounded-[14px] p-6" style={{ background: 'var(--bg)', border: '1px solid var(--line)' }}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[17px] font-semibold" style={{ color: 'var(--ink)' }}>Recent Photos</h3>
            <span className="text-sm font-medium" style={{ color: 'var(--muted)' }}>Latest uploads</span>
          </div>
          {recentPhotos.length > 0 ? (
            <div className="grid grid-cols-3 gap-3">
              {recentPhotos.map((photo) => {
                const isNew = now - photo.uploadedAt < 2 * 60 * 1000;
                return (
                <div key={photo.id} className="relative aspect-square rounded-[12px] overflow-hidden" style={{ background: 'var(--bg-deep)', outline: isNew ? '2px solid var(--violet)' : 'none', outlineOffset: '-1px' }}>
                  <AdminImage src={photo.thumbUrl || photo.url} alt={`${photo.uploader} photo`} sizes="(max-width: 1024px) 33vw, 180px" />
                  {isNew && (
                    <span className="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded-full text-[9px] font-bold text-white" style={{ background: 'var(--violet)', letterSpacing: '0.04em' }}>NEW</span>
                  )}
                </div>
              )})}
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
            {recentGuests.map((guest) => {
              const status = (guest.status as GuestStatus) ?? 'Left event';
              const isNewest = guest.id === newestGuestId;
              return (
                <div key={guest.id} style={{ borderTop: '1px solid var(--line)', background: isNewest ? 'color-mix(in srgb, var(--violet) 6%, transparent)' : undefined }}>
                  <div className="hidden xl:grid grid-cols-[1.9fr_1fr_.8fr_.9fr_.6fr] px-[18px] py-[11px] items-center">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <GuestAvatar guest={guest} size="sm" />
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[13px] font-semibold truncate" style={{ color: 'var(--ink)' }}>{guest.username}</span>
                          {isNewest && <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold" style={{ background: 'var(--violet)', color: 'white', letterSpacing: '0.04em' }}>NEW</span>}
                        </div>
                        <div className="text-[11px]" style={{ color: 'var(--muted)' }}>{timeAgo(guest.joinedAt)}</div>
                      </div>
                    </div>
                    <div className="text-[12px]" style={{ color: 'var(--muted)' }}>{new Date(guest.joinedAt).toLocaleDateString()}</div>
                    <div className="text-[13px] font-semibold" style={{ color: 'var(--ink)' }}>{guest.photoCount}</div>
                    <div><StatusBadge status={status} /></div>
                    <div />
                  </div>

                  <div className="xl:hidden px-[18px] py-4 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <GuestAvatar guest={guest} size="md" />
                        <div className="min-w-0">
                          <div className="text-[13px] font-semibold truncate" style={{ color: 'var(--ink)' }}>{guest.username}</div>
                          <div className="text-[11px]" style={{ color: 'var(--muted)' }}>{timeAgo(guest.joinedAt)}</div>
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
