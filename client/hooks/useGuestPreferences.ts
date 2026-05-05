'use client';

import { useEffect, useState } from 'react';

const STORAGE_KEY = 'swarm-gallery-guest-preferences';

interface GuestPreferences {
  faceBlurEnabled: boolean;
}

const DEFAULTS: GuestPreferences = {
  faceBlurEnabled: false,
};

function loadPreferences(): GuestPreferences {
  if (typeof window === 'undefined') return DEFAULTS;

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULTS;

    const parsed = JSON.parse(raw) as Partial<GuestPreferences>;
    return {
      faceBlurEnabled: typeof parsed.faceBlurEnabled === 'boolean'
        ? parsed.faceBlurEnabled
        : DEFAULTS.faceBlurEnabled,
    };
  } catch {
    return DEFAULTS;
  }
}

export function useGuestPreferences() {
  const [preferences, setPreferences] = useState<GuestPreferences>(DEFAULTS);

  useEffect(() => {
    setPreferences(loadPreferences());
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
    } catch {
      // Ignore storage failures on restricted browsers.
    }
  }, [preferences]);

  function setFaceBlurEnabled(faceBlurEnabled: boolean) {
    setPreferences((prev) => ({ ...prev, faceBlurEnabled }));
  }

  return {
    ...preferences,
    setFaceBlurEnabled,
  };
}
