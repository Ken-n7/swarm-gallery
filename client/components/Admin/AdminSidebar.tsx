'use client';

function DashboardIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M4 13h4v7H4zM10 4h4v16h-4zM16 9h4v11h-4z" />
    </svg>
  );
}

function GalleryIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="4" y="5" width="16" height="14" rx="2" />
      <path d="M8 14l2.5-2.5a1 1 0 0 1 1.4 0L15 14l1.5-1.5a1 1 0 0 1 1.4 0L20 14" />
      <circle cx="9" cy="9" r="1.2" fill="currentColor" stroke="none" />
    </svg>
  );
}

function GuestsIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M16 20v-1a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v1" />
      <circle cx="10" cy="8" r="3" />
      <path d="M20 20v-1a3 3 0 0 0-2-2.82" />
      <path d="M16 5.2a3 3 0 0 1 0 5.6" />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M12 3l1.2 2.43 2.68.39-1.94 1.89.46 2.66L12 9.3l-2.4 1.27.46-2.66-1.94-1.89 2.68-.39z" />
      <circle cx="12" cy="15" r="3" />
      <path d="M12 18v3M12 3v3M3 12h3M18 12h3M5.64 5.64l2.12 2.12M16.24 16.24l2.12 2.12M18.36 5.64l-2.12 2.12M7.76 16.24l-2.12 2.12" />
    </svg>
  );
}

const NAV = [
  { id: 'dashboard', label: 'Dashboard', icon: <DashboardIcon /> },
  { id: 'galleries', label: 'Galleries', icon: <GalleryIcon /> },
  { id: 'guests', label: 'Guests', icon: <GuestsIcon /> },
  { id: 'settings', label: 'Settings', icon: <SettingsIcon /> },
];

interface AdminSidebarProps {
  currentPage: string;
  onPageChange: (page: string) => void;
  onClose?: () => void;
}

export function AdminSidebar({ currentPage, onPageChange, onClose }: AdminSidebarProps) {
  return (
    <div className="w-full h-full text-white flex flex-col overflow-hidden" style={{ background: 'var(--sidebar-bg)' }}>
      {/* Brand */}
      <div className="p-4 flex-none" style={{ borderBottom: '1px solid rgba(255,255,255,.08)' }}>
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm"
            style={{ background: 'var(--neon-gradient)', fontFamily: 'var(--font-paytone)' }}
          >
            S
          </div>
          <div>
            <div className="text-[15px] text-white" style={{ fontFamily: 'var(--font-paytone)' }}>Swarm Admin</div>
            <div className="text-[11px]" style={{ color: 'rgba(255,255,255,.45)' }}>Control room</div>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              aria-label="Close navigation menu"
              className="ml-auto w-8 h-8 rounded-full flex items-center justify-center transition-colors"
              style={{ background: 'rgba(255,255,255,.06)', color: 'rgba(255,255,255,.65)' }}
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Event pill */}
      <div className="p-3 flex-none" style={{ borderBottom: '1px solid rgba(255,255,255,.08)' }}>
        <div className="rounded-[14px] p-3" style={{ background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.06)' }}>
          <div className="flex items-center justify-between mb-2">
            <div className="text-[11px] font-bold uppercase tracking-[0.08em]" style={{ color: 'rgba(255,255,255,.4)' }}>Active Event</div>
            <div className="px-2 py-1 rounded-full text-[10px] font-semibold" style={{ background: 'rgba(31,143,74,.18)', color: '#9fe0b5' }}>Live</div>
          </div>
          <div className="text-sm text-white">Demo Event</div>
          <div className="text-[11px]" style={{ color: 'rgba(255,255,255,.45)' }}>Guests uploading in real time</div>
        </div>
      </div>

      {/* Nav */}
      <div className="flex-1 overflow-auto p-2">
        {NAV.map((item) => {
          const isActive = item.id === currentPage;
          return (
            <div key={item.id}>
              <button
                onClick={() => {
                  onPageChange(item.id);
                  onClose?.();
                }}
                className={`w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors ${
                  isActive ? 'text-white' : 'hover:text-white'
                }`}
                style={isActive ? { background: 'rgba(139,92,255,.18)', color: '#c8b5ff' } : { color: 'rgba(255,255,255,.52)' }}
              >
                <span>{item.icon}</span>
                <span className="text-sm font-medium">{item.label}</span>
                {isActive && <span className="ml-auto w-1.5 h-1.5 rounded-full" style={{ background: 'var(--violet)' }} />}
              </button>
            </div>
          );
        })}
      </div>

      {/* Admin avatar */}
      <div className="p-3 flex-none flex items-center gap-3" style={{ borderTop: '1px solid rgba(255,255,255,.08)' }}>
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm"
          style={{ background: 'var(--neon-gradient)' }}
        >
          A
        </div>
        <div>
          <div className="text-sm font-semibold text-white">Admin</div>
          <div className="text-[11px]" style={{ color: 'rgba(255,255,255,.45)' }}>Session owner</div>
        </div>
      </div>
    </div>
  );
}
