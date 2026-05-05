'use client';

import React from 'react';

const NAV = [
  { id: 'dashboard', label: 'Dashboard', icon: '📊' },
  { id: 'galleries', label: 'Galleries', icon: '🖼️' },
  { id: 'guests', label: 'Guests', icon: '👥' },
  {
    id: 'settings',
    label: 'Settings',
    icon: '⚙️',
    sub: [
      { id: 'event-info', label: 'Event Info' },
      { id: 'access-qr', label: 'Access & QR' },
      { id: 'upload-controls', label: 'Upload Controls' },
      { id: 'privacy', label: 'Privacy' },
      { id: 'storage', label: 'Storage' },
      { id: 'danger', label: 'Danger Zone', danger: true },
    ],
  },
];

interface AdminSidebarProps {
  currentPage: string;
  onPageChange: (page: string) => void;
  onClose?: () => void;
}

export function AdminSidebar({ currentPage, onPageChange, onClose }: AdminSidebarProps) {
  const [settingsOpen, setSettingsOpen] = React.useState(
    ['event-info', 'access-qr', 'upload-controls', 'privacy', 'storage', 'danger'].includes(currentPage)
  );

  return (
    <div className="w-full h-full bg-slate-900 text-white flex flex-col overflow-hidden">
      {/* Brand */}
      <div className="p-4 border-b border-slate-700 flex-none">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-pink-500 via-violet-500 to-cyan-400 flex items-center justify-center text-white font-black text-sm">
            S
          </div>
          <div>
            <div className="font-bold text-sm">Swarm Admin</div>
            <div className="text-xs text-slate-400">Demo Event</div>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="ml-auto w-7 h-7 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-400"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Event pill */}
      <div className="p-3 border-b border-slate-700 flex-none">
        <div className="bg-slate-800 rounded-lg p-3">
          <div className="text-xs font-bold text-white mb-1">Demo Event</div>
          <div className="text-xs text-slate-400">Active</div>
        </div>
      </div>

      {/* Nav */}
      <div className="flex-1 overflow-auto p-2">
        {NAV.map((item) => {
          const isParentActive = item.id === currentPage || (item.sub && item.sub.some((s) => s.id === currentPage));
          const isActive = item.id === currentPage && !item.sub;
          return (
            <div key={item.id}>
              <button
                onClick={() => {
                  if (item.sub) {
                    setSettingsOpen((o) => !o);
                    if (!settingsOpen) onPageChange(item.sub![0].id);
                  } else {
                    onPageChange(item.id);
                    onClose?.();
                  }
                }}
                className={`w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors ${
                  isActive
                    ? 'bg-violet-500/20 text-violet-400'
                    : isParentActive
                    ? 'text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <span className="text-lg">{item.icon}</span>
                <span className="text-sm font-medium">{item.label}</span>
                {item.sub && (
                  <span className={`ml-auto transition-transform ${settingsOpen ? 'rotate-90' : ''}`}>▶</span>
                )}
              </button>
              {item.sub && settingsOpen && (
                <div className="ml-9 mb-2">
                  {item.sub.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => {
                        onPageChange(s.id);
                        onClose?.();
                      }}
                      className={`w-full text-left p-2 rounded text-sm transition-colors ${
                        s.danger
                          ? 'text-red-400 hover:text-red-300'
                          : s.id === currentPage
                          ? 'bg-violet-500/20 text-violet-400'
                          : 'text-slate-500 hover:text-slate-400'
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Admin avatar */}
      <div className="p-3 border-t border-slate-700 flex-none flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-pink-500 via-violet-500 to-cyan-400 flex items-center justify-center text-white font-bold text-sm">
          A
        </div>
        <div>
          <div className="text-sm font-semibold text-white">Admin</div>
          <div className="text-xs text-slate-400">Demo Event</div>
        </div>
      </div>
    </div>
  );
}