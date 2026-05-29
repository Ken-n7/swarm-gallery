'use client';

import React from 'react';
import { AdminSidebar } from './AdminSidebar';
import { AdminTopBar } from './AdminTopBar';

interface AdminLayoutProps {
  currentPage: string;
  onPageChange: (page: string) => void;
  title: string;
  subtitle?: string;
  activeGuests?: number;
  photoCount?: number;
  lastSyncedAt?: number | null;
  children: React.ReactNode;
}

export function AdminLayout({ currentPage, onPageChange, title, subtitle, activeGuests = 0, photoCount = 0, lastSyncedAt = null, children }: AdminLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = React.useState(false);

  return (
    <div className="h-screen flex" style={{ background: 'var(--bg-soft)' }}>
      {/* Desktop sidebar */}
      <div className="hidden lg:block w-64" style={{ borderRight: '1px solid var(--line)' }}>
        <AdminSidebar currentPage={currentPage} onPageChange={onPageChange} photoCount={photoCount} activeGuests={activeGuests} />
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
          <div className="absolute left-0 top-0 w-64 h-full">
            <AdminSidebar
              currentPage={currentPage}
              onPageChange={onPageChange}
              onClose={() => setSidebarOpen(false)}
              photoCount={photoCount}
              activeGuests={activeGuests}
            />
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        <AdminTopBar title={title} subtitle={subtitle} onMenu={() => setSidebarOpen(true)} activeGuests={activeGuests} lastSyncedAt={lastSyncedAt} />
        <div className="flex-1 overflow-auto">
          {children}
        </div>
      </div>
    </div>
  );
}
