'use client';

import { useState, useEffect } from 'react';

export function useOrientation(): 'portrait' | 'landscape' {
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait');

  useEffect(() => {
    const mediaQuery = window.matchMedia('(orientation: landscape)');

    function computeOrientation() {
      if (window.screen?.orientation?.type) {
        return window.screen.orientation.type.startsWith('landscape') ? 'landscape' : 'portrait';
      }
      if (typeof window.orientation === 'number') {
        return Math.abs(window.orientation) === 90 ? 'landscape' : 'portrait';
      }
      return mediaQuery.matches || window.innerWidth > window.innerHeight ? 'landscape' : 'portrait';
    }

    function update() {
      setOrientation(computeOrientation());
    }

    update();
    window.addEventListener('resize', update);
    window.addEventListener('orientationchange', update);
    mediaQuery.addEventListener?.('change', update);
    window.visualViewport?.addEventListener('resize', update);

    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('orientationchange', update);
      mediaQuery.removeEventListener?.('change', update);
      window.visualViewport?.removeEventListener('resize', update);
    };
  }, []);

  return orientation;
}
