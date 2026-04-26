'use client';

import { useState, useEffect } from 'react';

export function useOrientation(): 'portrait' | 'landscape' {
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait');

  useEffect(() => {
    function update() {
      setOrientation(window.innerWidth > window.innerHeight ? 'landscape' : 'portrait');
    }
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  return orientation;
}
