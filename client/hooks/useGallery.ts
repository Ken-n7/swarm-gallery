'use client';

import { useState, useCallback } from 'react';
import { Photo } from '@/types';
import { useSocket } from './useSocket';

export function useGallery(userId?: string) {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [userCount, setUserCount] = useState(0);

  const handleEvent = useCallback((event: string, data: unknown) => {
    if (event === 'photo-history') {
      setPhotos(data as Photo[]);
    } else if (event === 'new-photo') {
      setPhotos((prev) => [data as Photo, ...prev]);
    } else if (event === 'photo-liked') {
      const payload = data as { photoId: string; likeCount: number; userId?: string; liked: boolean };
      setPhotos((prev) => prev.map((photo) => (
        photo.id === payload.photoId
          ? {
              ...photo,
              likeCount: payload.likeCount,
              likedByMe: payload.userId && userId && payload.userId === userId ? payload.liked : photo.likedByMe,
            }
          : photo
      )));
    } else if (event === 'photo-deleted') {
      const { photoId } = data as { photoId: string };
      setPhotos((prev) => prev.filter((p) => p.id !== photoId));
    } else if (event === 'user-count') {
      setUserCount((data as { count: number }).count);
    }
  }, [userId]);

  useSocket(handleEvent, userId);

  return { photos, userCount };
}
