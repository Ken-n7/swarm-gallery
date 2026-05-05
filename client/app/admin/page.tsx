'use client';

import { useEffect, useState } from 'react';
import { checkAdmin, getAdminStats } from '@/lib/api';
import { AdminLayout } from '@/components/Admin/AdminLayout';
import { AdminLoginForm } from '@/components/Admin/AdminLoginForm';
import type { AdminStats } from '@/components/Admin/shared/AdminShared';
import { AdminDashboard } from '@/components/Admin/pages/AdminDashboard';
import { AdminGalleries } from '@/components/Admin/pages/AdminGalleries';
import { AdminGuests } from '@/components/Admin/pages/AdminGuests';
import { AdminSettings } from '@/components/Admin/pages/AdminSettings';

export default function AdminPage() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [statsUpdatedAt, setStatsUpdatedAt] = useState<number | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState('dashboard');

  useEffect(() => {
    let cancelled = false;

    const refreshStats = () => {
      getAdminStats()
        .then((data) => {
          if (!cancelled) {
            setStats(data);
            setStatsUpdatedAt(Date.now());
          }
        })
        .catch(() => {});
    };

    refreshStats();
    const intervalId = window.setInterval(refreshStats, 5000);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, []);

  useEffect(() => {
    checkAdmin()
      .then((res) => setIsAuthenticated(res.admin))
      .catch(() => setIsAuthenticated(false))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-soft)' }}>
        <div style={{ color: 'var(--ink-soft)' }}>Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <AdminLoginForm onLogin={() => setIsAuthenticated(true)} />;
  }

  const getPageTitle = (page: string) => {
    switch (page) {
      case 'dashboard': return 'Dashboard';
      case 'galleries': return 'Galleries';
      case 'guests': return 'Guests';
      case 'settings': return 'Settings';
      default: return 'Settings';
    }
  };

  const getPageSubtitle = (page: string) => {
    switch (page) {
      case 'dashboard': return 'Overview of your event';
      case 'galleries': return 'Manage event photos';
      case 'guests': return 'View and manage guests';
      case 'settings': return 'Manage event handoff, privacy, and temporary storage';
      default: return 'Configure event settings';
    }
  };

  const renderContent = () => {
    switch (currentPage) {
      case 'dashboard':
        return <AdminDashboard />;
      case 'galleries':
        return <AdminGalleries />;
      case 'guests':
        return <AdminGuests />;
      case 'settings':
        return <AdminSettings />;
      default:
        return <AdminDashboard />;
    }
  };

  return (
    <AdminLayout
      currentPage={currentPage}
      onPageChange={setCurrentPage}
      title={getPageTitle(currentPage)}
      subtitle={getPageSubtitle(currentPage)}
      activeGuests={stats?.activeGuests || 0}
      lastSyncedAt={statsUpdatedAt}
    >
      {renderContent()}
    </AdminLayout>
  );
}
