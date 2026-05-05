'use client';

interface AdminTopBarProps {
  title: string;
  subtitle?: string;
  onMenu?: () => void;
  activeGuests?: number;
}

export function AdminTopBar({ title, subtitle, onMenu, activeGuests = 0 }: AdminTopBarProps) {
  return (
    <div className="h-14 bg-white border-b border-slate-200 flex items-center px-5 gap-3 flex-none">
      {onMenu && (
        <button
          onClick={onMenu}
          className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600"
        >
          ☰
        </button>
      )}
      <div className="flex-1 min-w-0">
        <div className="text-lg font-bold text-slate-900">{title}</div>
        {subtitle && <div className="text-xs text-slate-500">{subtitle}</div>}
      </div>
      <div className="px-3 py-1 rounded-full bg-green-50 text-green-700 text-xs font-medium">
        ● Live · {activeGuests} guests
      </div>
      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-pink-500 via-violet-500 to-cyan-400 flex items-center justify-center text-white font-bold text-sm">
        A
      </div>
    </div>
  );
}