'use client';

interface AdminTopBarProps {
  title: string;
  subtitle?: string;
  onMenu?: () => void;
  activeGuests?: number;
  lastSyncedAt?: number | null;
}

export function AdminTopBar({ title, subtitle, onMenu, activeGuests = 0, lastSyncedAt = null }: AdminTopBarProps) {
  const lastSyncedLabel = lastSyncedAt
    ? new Date(lastSyncedAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', second: '2-digit' })
    : null;

  return (
    <div className="h-16 flex items-center px-5 gap-3 flex-none" style={{ background: 'var(--bg)', borderBottom: '1px solid var(--line)' }}>
      {onMenu && (
        <button
          onClick={onMenu}
          aria-label="Open navigation menu"
          className="w-9 h-9 rounded-full flex items-center justify-center"
          style={{ background: 'var(--bg-soft)', color: 'var(--ink-soft)', border: '1px solid var(--line)' }}
        >
          <svg viewBox="0 0 24 24" className="w-4.5 h-4.5" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 7h16M4 12h16M4 17h16" />
          </svg>
        </button>
      )}
      <div className="flex-1 min-w-0">
        <div className="text-[18px] sm:text-[22px] truncate" style={{ color: 'var(--ink)', fontFamily: 'var(--font-paytone)' }}>{title}</div>
        {subtitle && <div className="text-[12px]" style={{ color: 'var(--muted)' }}>{subtitle}</div>}
      </div>
      <div className="px-3 py-1.5 rounded-full text-xs font-semibold leading-tight shrink-0" style={{ background: 'var(--good-tint)', color: 'var(--good)' }}>
        <div>
          <span className="inline-block w-1.5 h-1.5 rounded-full mr-1.5 align-middle" style={{ background: 'var(--good)' }} />
          Live · {activeGuests} guests
        </div>
        {lastSyncedLabel ? (
          <div className="text-[10px] font-medium mt-1" style={{ color: 'var(--muted)' }}>
            Updated {lastSyncedLabel}
          </div>
        ) : (
          <div className="text-[10px] font-medium mt-1" style={{ color: 'var(--muted)' }}>
            Syncing…
          </div>
        )}
      </div>
      <img src="/logo-512.png" alt="Swarm Gallery" className="w-9 h-9 rounded-full object-cover shrink-0" />
    </div>
  );
}
