'use client';

function DashboardIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M4 13h4v7H4zM10 4h4v16h-4zM16 9h4v11h-4z" />
    </svg>
  );
}

function GalleryIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="4" y="5" width="16" height="14" rx="2" />
      <path d="M8 14l2.5-2.5a1 1 0 0 1 1.4 0L15 14l1.5-1.5a1 1 0 0 1 1.4 0L20 14" />
      <circle cx="9" cy="9" r="1.2" fill="currentColor" stroke="none" />
    </svg>
  );
}

function GuestsIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M16 20v-1a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v1" />
      <circle cx="10" cy="8" r="3" />
      <path d="M20 20v-1a3 3 0 0 0-2-2.82" />
      <path d="M16 5.2a3 3 0 0 1 0 5.6" />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

const NAV = [
  { id: 'dashboard', label: 'Dashboard', icon: <DashboardIcon /> },
  { id: 'galleries', label: 'Galleries', icon: <GalleryIcon /> },
  { id: 'guests',    label: 'Guests',    icon: <GuestsIcon /> },
  { id: 'settings',  label: 'Settings',  icon: <SettingsIcon /> },
];

function StatPill({ value, label }: { value: string | number; label: string }) {
  return (
    <div
      className="flex flex-col items-center px-3 py-2 rounded-xl flex-1"
      style={{ background: 'rgba(255,255,255,.06)' }}
    >
      <span className="text-[17px] font-black leading-none" style={{ color: '#c4b5fd' }}>{value}</span>
      <span className="text-[10px] mt-0.5 font-medium" style={{ color: 'rgba(255,255,255,.38)' }}>{label}</span>
    </div>
  );
}

interface AdminSidebarProps {
  currentPage: string;
  onPageChange: (page: string) => void;
  onClose?: () => void;
  photoCount?: number;
  activeGuests?: number;
}

export function AdminSidebar({ currentPage, onPageChange, onClose, photoCount = 0, activeGuests = 0 }: AdminSidebarProps) {
  const bg = 'linear-gradient(180deg, #1a0f3a 0%, #120d2a 40%, #0f0d1f 100%)';

  return (
    <div className="w-full h-full text-white flex flex-col overflow-y-auto" style={{ background: bg }}>

      {/* ── Header ───────────────────────────────────────── */}
      <div
        className="flex items-center gap-3 px-5 pt-6 pb-5 flex-none"
        style={{
          background: 'linear-gradient(160deg, rgba(124,58,237,.35) 0%, transparent 70%)',
          borderBottom: '1px solid rgba(255,255,255,.07)',
        }}
      >
        <img
          src="/logo-512.png"
          alt="Swarm Gallery"
          className="w-10 h-10 rounded-full object-cover shrink-0"
          style={{ boxShadow: '0 0 0 2px rgba(124,58,237,.4), 0 4px 12px rgba(0,0,0,.3)' }}
        />
        <div className="min-w-0 flex-1">
          <p className="font-black text-white text-sm leading-tight" style={{ fontFamily: 'var(--font-paytone)' }}>
            Swarm Admin
          </p>
          <p className="text-[11px]" style={{ color: 'rgba(255,255,255,.45)' }}>Control room</p>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            aria-label="Close navigation menu"
            className="w-7 h-7 rounded-full flex items-center justify-center"
            style={{ background: 'rgba(255,255,255,.1)' }}
          >
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* ── Live event status + stats ─────────────────────── */}
      <div
        className="px-4 py-4 flex-none"
        style={{ borderBottom: '1px solid rgba(255,255,255,.07)' }}
      >
        <div className="flex items-center gap-1.5 mb-1.5">
          <span
            className="relative flex w-2 h-2 shrink-0"
          >
            <span className="ping-ring absolute inline-flex w-full h-full rounded-full" style={{ background: '#22c55e', opacity: .6 }} />
            <span className="relative inline-flex w-2 h-2 rounded-full" style={{ background: '#22c55e' }} />
          </span>
          <span className="text-[11px] font-bold tracking-wide" style={{ color: '#4ade80' }}>LIVE</span>
        </div>
        <p className="text-white font-bold text-[14px] leading-tight mb-3">Demo Event</p>
        <div className="grid grid-cols-2 gap-1.5">
          <StatPill value={photoCount} label="Photos" />
          <StatPill value={activeGuests > 0 ? activeGuests : '—'} label="Active" />
        </div>
      </div>

      {/* ── Nav ──────────────────────────────────────────── */}
      <div className="px-2.5 py-3 flex-1">
        {NAV.map((item) => {
          const isActive = item.id === currentPage;
          return (
            <button
              key={item.id}
              onClick={() => { onPageChange(item.id); onClose?.(); }}
              className="relative w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all overflow-hidden"
              style={
                isActive
                  ? { background: 'rgba(124,58,237,.28)', color: '#c4b5fd' }
                  : { color: 'rgba(255,255,255,.55)' }
              }
            >
              {isActive && (
                <span
                  className="absolute left-0 top-2 bottom-2 rounded-full"
                  style={{ width: 3, background: 'var(--neon-gradient)' }}
                />
              )}
              {item.icon}
              <span className="text-sm font-semibold">{item.label}</span>
            </button>
          );
        })}
      </div>

      {/* ── Footer ───────────────────────────────────────── */}
      <div
        className="px-4 py-4 flex items-center gap-3 flex-none"
        style={{ borderTop: '1px solid rgba(255,255,255,.07)' }}
      >
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0"
          style={{ background: 'var(--neon-gradient)', boxShadow: '0 0 0 2px rgba(124,58,237,.3)' }}
        >
          A
        </div>
        <div className="min-w-0">
          <div className="text-sm font-semibold text-white leading-tight">Admin</div>
          <div className="text-[11px]" style={{ color: 'rgba(255,255,255,.4)' }}>Session owner</div>
        </div>
      </div>
    </div>
  );
}
