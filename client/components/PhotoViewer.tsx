'use client';

import Image from 'next/image';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Photo } from '@/types';
import { deletePhoto, likePhoto, photoUrl, unlikePhoto } from '@/lib/api';
import { UserAvatar } from './UserAvatar';
import { timeAgo } from '@/lib/time';

interface Props {
  photos: Photo[];
  startIndex: number;
  currentUser: string;
  currentUserId: string;
  title?: string;
  onClose: () => void;
}

export function PhotoViewer({ photos: initialPhotos, startIndex, currentUser, currentUserId, title = 'Gallery', onClose }: Props) {
  const [photos, setPhotos] = useState(initialPhotos);
  const [index, setIndex] = useState(startIndex);
  const [liking, setLiking] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const confirmTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const photo = photos[index];
  const isOwn = photo?.uploader === currentUser;

  const goNext = useCallback(() => {
    setConfirmDelete(false);
    setIndex((i) => Math.min(i + 1, photos.length - 1));
  }, [photos.length]);

  const goPrev = useCallback(() => {
    setConfirmDelete(false);
    setIndex((i) => Math.max(i - 1, 0));
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') goNext();
      if (e.key === 'ArrowLeft') goPrev();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [goNext, goPrev, onClose]);

  function onTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX;
  }

  function onTouchEnd(e: React.TouchEvent) {
    if (touchStartX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(dx) < 50) return;
    if (dx < 0) goNext();
    else         goPrev();
  }

  async function handleDelete() {
    if (!confirmDelete) {
      setConfirmDelete(true);
      confirmTimer.current = setTimeout(() => setConfirmDelete(false), 2500);
      return;
    }
    if (confirmTimer.current) clearTimeout(confirmTimer.current);
    setDeleting(true);
    try {
      await deletePhoto(photo.id, currentUser);
      const next = photos.filter((p) => p.id !== photo.id);
      if (next.length === 0) { onClose(); return; }
      setPhotos(next);
      setIndex((i) => Math.min(i, next.length - 1));
      setConfirmDelete(false);
    } catch {
      setConfirmDelete(false);
    } finally {
      setDeleting(false);
    }
  }

  async function handleLikeToggle() {
    if (!photo || liking) return;

    const currentlyLiked = !!photo.likedByMe;
    setLiking(true);
    try {
      const result = currentlyLiked
        ? await unlikePhoto(photo.id, currentUserId)
        : await likePhoto(photo.id, currentUserId);

      setPhotos((prev) => prev.map((entry) => (
        entry.id === photo.id
          ? { ...entry, likeCount: result.likeCount, likedByMe: result.likedByMe }
          : entry
      )));
    } finally {
      setLiking(false);
    }
  }

  if (!photo) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col"
      style={{ background: 'var(--ink)' }}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {/* Top chrome */}
      <div
        className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-4 py-4"
        style={{ background: 'linear-gradient(to bottom, rgba(18,18,41,.7), transparent)', height: 110 }}
      >
        <button
          onClick={onClose}
          aria-label="Close photo viewer"
          className="w-9 h-9 rounded-full flex items-center justify-center"
          style={{ background: 'rgba(255,255,255,.2)', backdropFilter: 'blur(12px)' }}
        >
          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        <div className="text-center">
          <div className="text-white text-[11px] font-semibold">{title}</div>
          <span className="text-white/70 text-[11px] font-medium">{index + 1} of {photos.length}</span>
        </div>

        {/* Delete button — own photos only */}
        {isOwn ? (
          <button
            onClick={handleDelete}
            disabled={deleting}
            aria-label={confirmDelete ? 'Confirm delete photo' : 'Delete photo'}
            className="w-9 h-9 rounded-full flex items-center justify-center transition-colors"
            style={{
              background: confirmDelete ? 'var(--danger)' : 'rgba(255,255,255,.2)',
              backdropFilter: 'blur(12px)',
            }}
          >
            {confirmDelete ? (
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            )}
          </button>
        ) : (
          <div className="w-9" />
        )}
      </div>

      {/* Media */}
      {photo.mimetype?.startsWith('video/') ? (
        <video
          key={photo.url}
          src={photoUrl(photo.url)}
          className="w-full h-full object-contain"
          controls
          autoPlay
          playsInline
        />
      ) : (
        <div className="relative w-full h-full">
          <Image src={photoUrl(photo.url)} alt="" fill unoptimized sizes="100vw" className="object-contain" />
        </div>
      )}

      {/* Bottom chrome */}
      <div
        className="absolute bottom-0 left-0 right-0 px-4 pb-8 pt-20 flex items-end justify-between"
        style={{ background: 'linear-gradient(to top, rgba(18,18,41,.8), transparent)' }}
      >
        <div className="flex items-center gap-3">
          <UserAvatar username={photo.uploader} avatarUrl={photo.uploaderAvatarUrl} size="md" />
          <div>
            <p className="text-white text-[15px] font-semibold">{photo.uploader}</p>
            <p className="text-white/60 text-xs">{timeAgo(photo.uploadedAt)}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="min-w-[1.5rem] text-center text-white/85 text-xs font-semibold">
            {photo.likeCount ?? 0}
          </span>
          <button
            onClick={handleLikeToggle}
            disabled={liking}
            aria-label={photo.likedByMe ? 'Unlike photo' : 'Like photo'}
            className="w-11 h-11 rounded-full flex items-center justify-center"
            style={{ background: photo.likedByMe ? 'var(--pink)' : 'rgba(255,255,255,.2)', backdropFilter: 'blur(12px)' }}
          >
            <svg
              className="w-5 h-5"
              fill={photo.likedByMe ? 'white' : 'none'}
              stroke="white"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
          </button>
          <a
            href={photoUrl(photo.url)}
            download={photo.filename}
            target="_blank"
            rel="noreferrer"
            className="w-11 h-11 rounded-full flex items-center justify-center"
            style={{ background: 'rgba(255,255,255,.2)', backdropFilter: 'blur(12px)' }}
            aria-label="Download or open original media"
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
          onClick={goPrev}
          aria-label="Previous photo"
          className="absolute left-0 top-1/4 bottom-1/4 w-16 z-10"
        />
      )}
      {index < photos.length - 1 && (
        <button
          onClick={goNext}
          aria-label="Next photo"
          className="absolute right-0 top-1/4 bottom-1/4 w-16 z-10"
        />
      )}
    </div>
  );
}
