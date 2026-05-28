'use client';

import { useEffect } from 'react';

interface Props {
  open: boolean;
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
}

export function GuestBottomSheet({ open, title, subtitle, onClose, children }: Props) {
  useEffect(() => {
    if (!open) return;

    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }

    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-40"
          style={{ background: 'rgba(18,18,41,.42)' }}
          onClick={onClose}
        />
      )}
      <div
        className="fixed inset-x-0 bottom-0 z-50 transition-transform duration-300"
        style={{ transform: open ? 'translateY(0)' : 'translateY(100%)' }}
        aria-hidden={!open}
      >
        <div
          className="mx-auto w-full max-w-3xl rounded-t-[28px] shadow-[0_-20px_60px_rgba(15,23,42,.2)]"
          style={{ background: 'var(--bg-soft)', minHeight: '58vh', maxHeight: '86vh' }}
        >
          <div className="flex items-start justify-between gap-4 px-5 pt-3 pb-4 sticky top-0 z-10 rounded-t-[28px]" style={{ background: 'rgba(248,247,255,.94)', backdropFilter: 'blur(14px)', borderBottom: '1px solid var(--line)' }}>
            <div className="flex-1 min-w-0">
              <div className="w-10 h-1 rounded-full mx-auto mb-4" style={{ background: 'var(--line)' }} />
              <div className="text-[10px] font-bold uppercase tracking-[0.14em]" style={{ color: 'var(--violet)' }}>
                Quick panel
              </div>
              <h2 className="text-[22px] font-bold text-[var(--ink)] mt-1" style={{ fontFamily: 'var(--font-paytone)' }}>{title}</h2>
              {subtitle && (
                <p className="text-[12px] mt-1 max-w-md" style={{ color: 'var(--muted)' }}>
                  {subtitle}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label={`Close ${title.toLowerCase()} panel`}
              className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
              style={{ background: 'white', border: '1px solid var(--line)', color: 'var(--ink-soft)' }}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="overflow-y-auto px-0 pb-[max(1.5rem,env(safe-area-inset-bottom))]" style={{ maxHeight: 'calc(86vh - 104px)' }}>
            {children}
          </div>
        </div>
      </div>
    </>
  );
}
