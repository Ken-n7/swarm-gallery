'use client';

import { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'light' | 'dark' | 'system';

interface ThemeCtx {
  theme: Theme;
  isDark: boolean;
  setTheme: (t: Theme) => void;
  toggle: () => void;
}

const Ctx = createContext<ThemeCtx>({
  theme: 'system',
  isDark: false,
  setTheme: () => {},
  toggle: () => {},
});

export function useTheme() {
  return useContext(Ctx);
}

function resolveIsDark(theme: Theme): boolean {
  if (theme === 'dark') return true;
  if (theme === 'light') return false;
  return typeof window !== 'undefined'
    ? window.matchMedia('(prefers-color-scheme: dark)').matches
    : false;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('system');
  const [isDark, setIsDark] = useState(false);

  // On mount, read persisted preference
  useEffect(() => {
    const saved = (localStorage.getItem('swarm-theme') as Theme) ?? 'system';
    setThemeState(saved);
    const dark = resolveIsDark(saved);
    setIsDark(dark);
    document.documentElement.classList.toggle('dark', dark);
  }, []);

  // Watch system preference changes when theme === 'system'
  useEffect(() => {
    if (theme !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => {
      setIsDark(e.matches);
      document.documentElement.classList.toggle('dark', e.matches);
    };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [theme]);

  function setTheme(t: Theme) {
    setThemeState(t);
    localStorage.setItem('swarm-theme', t);
    const dark = resolveIsDark(t);
    setIsDark(dark);
    document.documentElement.classList.toggle('dark', dark);
  }

  function toggle() {
    setTheme(isDark ? 'light' : 'dark');
  }

  return <Ctx.Provider value={{ theme, isDark, setTheme, toggle }}>{children}</Ctx.Provider>;
}
