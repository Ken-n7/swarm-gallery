'use client';

import { useEffect, useState } from 'react';

const STORAGE_KEY = 'swarm-gallery-guest-preferences';
const EVENT_NAME = 'swarm-gallery-guest-preferences-updated';

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
  const [preferences, setPreferences] = useState<GuestPreferences>(() => loadPreferences());

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
      window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: preferences }));
    } catch {
      // Ignore storage failures on restricted browsers.
    }
  }, [preferences]);

  useEffect(() => {
    function syncFromStorage() {
      setPreferences(loadPreferences());
    }

    function onCustomEvent(event: Event) {
      const customEvent = event as CustomEvent<GuestPreferences>;
      if (customEvent.detail) setPreferences(customEvent.detail);
    }

    window.addEventListener('storage', syncFromStorage);
    window.addEventListener(EVENT_NAME, onCustomEvent as EventListener);

    return () => {
      window.removeEventListener('storage', syncFromStorage);
      window.removeEventListener(EVENT_NAME, onCustomEvent as EventListener);
    };
  }, []);

  function setFaceBlurEnabled(faceBlurEnabled: boolean) {
    setPreferences((prev) => ({ ...prev, faceBlurEnabled }));
  }

  return {
    ...preferences,
    setFaceBlurEnabled,
  };
}
