'use client';

import { useState, useEffect } from 'react';

export function useOrientation(): 'portrait' | 'landscape' {
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait');

  useEffect(() => {
    const mediaQuery = window.matchMedia('(orientation: landscape)');

    function computeOrientation() {
      // innerWidth/innerHeight is most reliable across real devices and headless browsers.
      // screen.orientation.type can mis-report in headless Chromium when viewport != screen.
      if (window.innerWidth > 0 && window.innerHeight > 0) {
        return window.innerWidth > window.innerHeight ? 'landscape' : 'portrait';
      }
      return mediaQuery.matches ? 'landscape' : 'portrait';
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
