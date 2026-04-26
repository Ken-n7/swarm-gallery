'use client';

import { useState, useCallback } from 'react';
import { Photo } from '@/types';
import { useSocket } from './useSocket';

export function useGallery(userId?: string) {
  const [photos, setPhotos] = useState<Photo[]>([]);

  const handleEvent = useCallback((event: string, data: unknown) => {
    if (event === 'photo-history') {
      setPhotos(data as Photo[]);
    } else if (event === 'new-photo') {
      setPhotos((prev) => [data as Photo, ...prev]);
    } else if (event === 'photo-deleted') {
      const { photoId } = data as { photoId: string };
      setPhotos((prev) => prev.filter((p) => p.id !== photoId));
    }
  }, []);

  useSocket(handleEvent, userId);

  return { photos };
}
