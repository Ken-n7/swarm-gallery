'use client';

import React from 'react';
import { adminLogin } from '@/lib/api';

interface AdminLoginFormProps {
  onLogin: () => void;
}

export function AdminLoginForm({ onLogin }: AdminLoginFormProps) {
  const [password, setPassword] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await adminLogin(password);
      onLogin();
    } catch {
      setError('Invalid password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: 'var(--bg-soft)' }}>
      <div className="w-full max-w-md rounded-[18px] p-8" style={{ background: 'var(--bg)', border: '1px solid var(--line)' }}>
        <div className="text-center mb-8">
          <img src="/logo-512.png" alt="Swarm Gallery" className="w-16 h-16 rounded-full object-cover mx-auto mb-4" />
          <h1 className="text-[22px]" style={{ color: 'var(--ink)', fontFamily: 'var(--font-paytone)' }}>Swarm Admin</h1>
          <p className="mt-2 text-[14px]" style={{ color: 'var(--ink-soft)' }}>Enter admin password to continue</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Admin password"
              className="w-full px-4 py-3 rounded-[12px] focus:outline-none focus:ring-2 focus:border-transparent"
              style={{ border: '1px solid var(--line)', color: 'var(--ink)' }}
              required
            />
          </div>

          {error && (
            <div className="text-sm text-center" style={{ color: 'var(--danger)' }}>{error}</div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full text-white font-semibold py-3 px-4 rounded-[14px] transition-colors disabled:opacity-60"
            style={{ background: 'var(--violet)' }}
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>
      </div>
    </div>
  );
}
