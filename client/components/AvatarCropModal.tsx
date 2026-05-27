'use client';

import { useState, useRef, useEffect, useCallback } from 'react';

/** On-screen diameter of the circular crop mask (px) */
const CROP_PX = 272;
/** Canvas output side length — server stores this square */
const OUT_PX = 400;

interface Props {
  src: string;              // object URL of the picked file
  onConfirm: (blob: Blob) => void;
  onCancel: () => void;
}

export function AvatarCropModal({ src, onConfirm, onCancel }: Props) {
  const imgRef       = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const imageSizeRef = useRef({ w: 0, h: 0 });

  const [scale,    setScale]    = useState(1);
  const [minScale, setMinScale] = useState(1);
  const [offset,   setOffset]   = useState({ x: 0, y: 0 });

  // Interaction refs — avoids stale closure issues in event handlers
  const drag  = useRef<{ sx: number; sy: number; ox: number; oy: number } | null>(null);
  const pinch = useRef<{ dist: number; sc: number } | null>(null);
  const scaleRef  = useRef(scale);
  const offsetRef = useRef(offset);
  useEffect(() => { scaleRef.current  = scale;  }, [scale]);
  useEffect(() => { offsetRef.current = offset; }, [offset]);

  // Clamp so the image always fills the crop circle (no black gaps)
  const clamp = useCallback((ox: number, oy: number, sc: number) => {
    const { w, h } = imageSizeRef.current;
    if (!w || !h) return { x: 0, y: 0 };
    const maxX = Math.max(0, (sc * w - CROP_PX) / 2);
    const maxY = Math.max(0, (sc * h - CROP_PX) / 2);
    return {
      x: Math.max(-maxX, Math.min(maxX, ox)),
      y: Math.max(-maxY, Math.min(maxY, oy)),
    };
  }, []);

  function onImgLoad() {
    const img = imgRef.current;
    if (!img) return;
    const { naturalWidth: w, naturalHeight: h } = img;
    imageSizeRef.current = { w, h };
    // Scale so the shorter side just fills the crop circle
    const min = CROP_PX / Math.min(w, h);
    setMinScale(min);
    setScale(min);
    scaleRef.current = min;
    setOffset({ x: 0, y: 0 });
  }

  // ── Pointer (mouse / stylus) drag ──────────────────────────────────────────
  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (e.pointerType === 'touch') return;
    drag.current = { sx: e.clientX, sy: e.clientY, ox: offsetRef.current.x, oy: offsetRef.current.y };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }
  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!drag.current) return;
    const nx = drag.current.ox + (e.clientX - drag.current.sx);
    const ny = drag.current.oy + (e.clientY - drag.current.sy);
    setOffset(clamp(nx, ny, scaleRef.current));
  }
  function onPointerUp() { drag.current = null; }

  // ── Touch (pinch-zoom + drag) ──────────────────────────────────────────────
  // Attach as a non-passive listener so preventDefault works on iOS
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    function onTouchStart(e: TouchEvent) {
      if (e.touches.length === 2) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        pinch.current = { dist: Math.hypot(dx, dy), sc: scaleRef.current };
        drag.current = null;
      } else {
        drag.current = { sx: e.touches[0].clientX, sy: e.touches[0].clientY, ox: offsetRef.current.x, oy: offsetRef.current.y };
        pinch.current = null;
      }
    }

    function onTouchMove(e: TouchEvent) {
      e.preventDefault();
      if (e.touches.length === 2 && pinch.current) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        const newSc = Math.max(
          scaleRef.current < pinch.current.sc ? pinch.current.sc * 0.5 : 0,
          (Math.hypot(dx, dy) / pinch.current.dist) * pinch.current.sc,
        );
        const clamped = Math.max(imageSizeRef.current.w > 0 ? CROP_PX / Math.min(imageSizeRef.current.w, imageSizeRef.current.h) : 0.5, Math.min(6, newSc));
        setScale(clamped);
        scaleRef.current = clamped;
        setOffset(prev => {
          const c = clamp(prev.x, prev.y, clamped);
          offsetRef.current = c;
          return c;
        });
      } else if (e.touches.length === 1 && drag.current) {
        const nx = drag.current.ox + (e.touches[0].clientX - drag.current.sx);
        const ny = drag.current.oy + (e.touches[0].clientY - drag.current.sy);
        const c = clamp(nx, ny, scaleRef.current);
        setOffset(c);
        offsetRef.current = c;
      }
    }

    function onTouchEnd(e: TouchEvent) {
      if (e.touches.length < 2) pinch.current = null;
      if (e.touches.length === 0) drag.current = null;
    }

    el.addEventListener('touchstart',  onTouchStart, { passive: false });
    el.addEventListener('touchmove',   onTouchMove,  { passive: false });
    el.addEventListener('touchend',    onTouchEnd,   { passive: false });
    return () => {
      el.removeEventListener('touchstart',  onTouchStart);
      el.removeEventListener('touchmove',   onTouchMove);
      el.removeEventListener('touchend',    onTouchEnd);
    };
  }, [clamp]);

  // ── Zoom slider ────────────────────────────────────────────────────────────
  function onZoomChange(e: React.ChangeEvent<HTMLInputElement>) {
    const sc = Number(e.target.value);
    setScale(sc);
    scaleRef.current = sc;
    setOffset(prev => {
      const c = clamp(prev.x, prev.y, sc);
      offsetRef.current = c;
      return c;
    });
  }

  // ── Confirm — render to canvas and return Blob ─────────────────────────────
  function handleConfirm() {
    const img = imgRef.current;
    const { w, h } = imageSizeRef.current;
    if (!img || !w || !h) return;

    const canvas = document.createElement('canvas');
    canvas.width  = OUT_PX;
    canvas.height = OUT_PX;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Circular clip
    ctx.beginPath();
    ctx.arc(OUT_PX / 2, OUT_PX / 2, OUT_PX / 2, 0, Math.PI * 2);
    ctx.clip();

    // Compute the source rect in image-natural-pixel coordinates.
    // offset.x > 0 shifts image right → crop circle sees pixels further LEFT.
    const sc = scaleRef.current;
    const ox = offsetRef.current.x;
    const oy = offsetRef.current.y;
    const srcSide = CROP_PX / sc;           // crop circle side in natural px
    const srcX = w / 2 - ox / sc - srcSide / 2;
    const srcY = h / 2 - oy / sc - srcSide / 2;

    ctx.drawImage(img, srcX, srcY, srcSide, srcSide, 0, 0, OUT_PX, OUT_PX);

    canvas.toBlob((blob) => { if (blob) onConfirm(blob); }, 'image/jpeg', 0.92);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-black"
      style={{ touchAction: 'none' }}
    >
      {/* Header bar */}
      <div className="flex items-center justify-between px-5 py-4 shrink-0">
        <button
          onClick={onCancel}
          className="text-[15px] text-white opacity-80 hover:opacity-100"
        >
          Cancel
        </button>
        <p className="text-[15px] font-semibold text-white">Move and Scale</p>
        <button
          onClick={handleConfirm}
          className="text-[15px] font-bold"
          style={{ color: '#a78bfa' }}
        >
          Use Photo
        </button>
      </div>

      {/* Interactive crop area */}
      <div
        ref={containerRef}
        className="flex-1 flex items-center justify-center overflow-hidden relative select-none"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        style={{ cursor: 'grab' }}
      >
        {/* The image — transform-origin center so scale + translate compose correctly */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          ref={imgRef}
          src={src}
          alt=""
          onLoad={onImgLoad}
          draggable={false}
          style={{
            transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
            transformOrigin: 'center',
            maxWidth: 'none',
            userSelect: 'none',
            pointerEvents: 'none',
          }}
        />

        {/* Dark vignette outside the crop circle */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `radial-gradient(circle ${CROP_PX / 2}px at center, transparent ${CROP_PX / 2}px, rgba(0,0,0,.72) ${CROP_PX / 2 + 1}px)`,
          }}
        />

        {/* Crop circle border */}
        <div
          className="absolute pointer-events-none rounded-full"
          style={{
            width: CROP_PX,
            height: CROP_PX,
            border: '2px solid rgba(255,255,255,.55)',
          }}
        />
      </div>

      {/* Zoom slider */}
      <div className="px-8 pt-4 pb-2 shrink-0">
        <input
          type="range"
          min={minScale}
          max={minScale * 4}
          step={0.005}
          value={scale}
          onChange={onZoomChange}
          className="w-full"
          style={{ accentColor: '#a78bfa' }}
        />
      </div>

      {/* Hint */}
      <p className="text-center pb-8 text-[12px] shrink-0" style={{ color: 'rgba(255,255,255,.4)' }}>
        Drag to reposition · Pinch or slider to zoom
      </p>
    </div>
  );
}
