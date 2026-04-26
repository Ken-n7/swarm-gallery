'use client';

import { useEffect, useState } from 'react';
import { Photo } from '@/types';
import { photoUrl } from '@/lib/api';
import { UserAvatar } from './UserAvatar';
import { timeAgo } from '@/lib/time';

interface Props {
  photos: Photo[];
  startIndex: number;
  onClose: () => void;
}

export function PhotoViewer({ photos, startIndex, onClose }: Props) {
  const [index, setIndex] = useState(startIndex);
  const [liked, setLiked] = useState(false);
  const photo = photos[index];

  useEffect(() => {
    setLiked(false);
  }, [index]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') setIndex((i) => Math.min(i + 1, photos.length - 1));
      if (e.key === 'ArrowLeft')  setIndex((i) => Math.max(i - 1, 0));
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, photos.length]);

  if (!photo) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ background: 'var(--ink)' }}>
      {/* Top chrome */}
      <div
        className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-4 py-4"
        style={{ background: 'linear-gradient(to bottom, rgba(18,18,41,.7), transparent)', height: 110 }}
      >
        <button
          onClick={onClose}
          className="w-9 h-9 rounded-full flex items-center justify-center"
          style={{ background: 'rgba(255,255,255,.2)', backdropFilter: 'blur(12px)' }}
        >
          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        <span className="text-white/85 text-xs font-medium">{index + 1} of {photos.length}</span>

        <div className="w-9" />
      </div>

      {/* Photo */}
      <img src={photoUrl(photo.url)} alt="" className="w-full h-full object-contain" />

      {/* Bottom chrome */}
      <div
        className="absolute bottom-0 left-0 right-0 px-4 pb-8 pt-20 flex items-end justify-between"
        style={{ background: 'linear-gradient(to top, rgba(18,18,41,.8), transparent)' }}
      >
        <div className="flex items-center gap-3">
          <UserAvatar username={photo.uploader} size="md" />
          <div>
            <p className="text-white text-[15px] font-semibold">{photo.uploader}</p>
            <p className="text-white/60 text-xs">{timeAgo(photo.uploadedAt)}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setLiked(!liked)}
            className="w-11 h-11 rounded-full flex items-center justify-center"
            style={{ background: liked ? 'var(--pink)' : 'rgba(255,255,255,.2)', backdropFilter: 'blur(12px)' }}
          >
            <svg
              className="w-5 h-5"
              fill={liked ? 'white' : 'none'}
              stroke="white"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
          </button>
          <a
            href={photoUrl(photo.url)}
            download={photo.filename}
            className="w-11 h-11 rounded-full flex items-center justify-center"
            style={{ background: 'rgba(255,255,255,.2)', backdropFilter: 'blur(12px)' }}
          >
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
          </a>
        </div>
      </div>

      {/* Side tap nav */}
      {index > 0 && (
        <button
          onClick={() => setIndex((i) => i - 1)}
          className="absolute left-0 top-1/4 bottom-1/4 w-16 z-10"
        />
      )}
      {index < photos.length - 1 && (
        <button
          onClick={() => setIndex((i) => i + 1)}
          className="absolute right-0 top-1/4 bottom-1/4 w-16 z-10"
        />
      )}
    </div>
  );
}
