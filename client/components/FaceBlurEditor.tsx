'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { BlurRegion } from '@/lib/faceBlur';
import { applyBlurRegionsToFile } from '@/lib/faceBlur';

interface FaceBlurEditorProps {
  file: File | null;
  open: boolean;
  indexLabel?: string;
  onCancel: () => void;
  onUseOriginal: () => void;
  onApply: (file: File) => void;
}

export function FaceBlurEditor({
  file,
  open,
  indexLabel,
  onCancel,
  onUseOriginal,
  onApply,
}: FaceBlurEditorProps) {
  const imageRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [regions, setRegions] = useState<BlurRegion[]>([]);
  const [brushSize, setBrushSize] = useState(0.22);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [showHelp, setShowHelp] = useState(false);
  const [canvasFrame, setCanvasFrame] = useState({ left: 0, top: 0, width: 0, height: 0 });

  const previewUrl = useMemo(() => {
    if (!file || !open) return '';
    return URL.createObjectURL(file);
  }, [file, open]);

  useEffect(() => {
    if (!previewUrl) return;
    return () => URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  const helperText = useMemo(() => {
    if (!regions.length) return 'Tap your face to place one or more blur circles before uploading.';
    return `${regions.length} blur ${regions.length === 1 ? 'area' : 'areas'} added. Tap more faces or apply now.`;
  }, [regions]);

  useEffect(() => {
    const image = imageRef.current;
    const canvas = canvasRef.current;
    if (!image || !canvas || !previewUrl) return;

    let cancelled = false;

    function drawPreview() {
      if (!imageRef.current || !canvasRef.current) return;

      const currentImage = imageRef.current;
      const currentCanvas = canvasRef.current;
      const width = currentImage.clientWidth;
      const height = currentImage.clientHeight;
      if (!width || !height) return;

      currentCanvas.width = width;
      currentCanvas.height = height;
      currentCanvas.style.width = `${width}px`;
      currentCanvas.style.height = `${height}px`;
      setCanvasFrame({
        left: currentImage.offsetLeft,
        top: currentImage.offsetTop,
        width,
        height,
      });

      const ctx = currentCanvas.getContext('2d');
      if (!ctx) return;

      ctx.clearRect(0, 0, width, height);

      for (const region of regions) {
        const radius = Math.max(12, region.size * Math.min(width, height) * 0.5);
        const centerX = region.x * width;
        const centerY = region.y * height;
        const patchSize = Math.ceil(radius * 2);
        const patchX = Math.round(centerX - radius);
        const patchY = Math.round(centerY - radius);
        const blurPx = Math.max(12, Math.round(radius * 0.65));

        const patchCanvas = document.createElement('canvas');
        patchCanvas.width = patchSize;
        patchCanvas.height = patchSize;
        const patchCtx = patchCanvas.getContext('2d');
        if (!patchCtx) continue;

        patchCtx.filter = `blur(${blurPx}px)`;
        patchCtx.drawImage(currentImage, -patchX, -patchY, width, height);
        patchCtx.filter = 'none';
        patchCtx.globalCompositeOperation = 'destination-in';
        patchCtx.beginPath();
        patchCtx.arc(radius, radius, radius, 0, Math.PI * 2);
        patchCtx.closePath();
        patchCtx.fill();

        ctx.drawImage(patchCanvas, patchX, patchY);
      }
    }

    function handleReady() {
      if (!cancelled) drawPreview();
    }

    if (image.complete) {
      drawPreview();
    } else {
      image.addEventListener('load', handleReady);
    }

    const resizeObserver = new ResizeObserver(() => drawPreview());
    resizeObserver.observe(image);
    window.addEventListener('resize', drawPreview);

    return () => {
      cancelled = true;
      image.removeEventListener('load', handleReady);
      resizeObserver.disconnect();
      window.removeEventListener('resize', drawPreview);
    };
  }, [previewUrl, regions]);

  if (!open || !file) return null;

  function addRegion(event: React.MouseEvent<HTMLDivElement>) {
    const image = imageRef.current;
    if (!image) return;

    const bounds = image.getBoundingClientRect();
    const x = (event.clientX - bounds.left) / bounds.width;
    const y = (event.clientY - bounds.top) / bounds.height;

    if (x < 0 || x > 1 || y < 0 || y > 1) return;

    setRegions((prev) => [...prev, { x, y, size: brushSize }]);
  }

  async function handleApply() {
    if (!file) return;
    setSaving(true);
    setError('');

    try {
      const blurred = await applyBlurRegionsToFile(file, regions);
      onApply(blurred);
    } catch (err: unknown) {
      setSaving(false);
      setError(err instanceof Error ? err.message : 'Could not blur this image');
    }
  }

  return (
    <div className="fixed inset-0 z-[80] overflow-y-auto" style={{ background: 'rgba(15,23,42,.74)' }}>
      <div className="min-h-full flex items-start justify-center p-4 sm:p-6">
        <div className="w-full max-w-3xl rounded-[24px] overflow-hidden my-4" style={{ background: 'var(--bg)', boxShadow: '0 24px 80px rgba(15,23,42,.28)' }}>
          <div className="flex items-start justify-between gap-3 px-4 py-3 sm:px-5 sm:py-4 sticky top-0 z-10" style={{ borderBottom: '1px solid var(--line)', background: 'color-mix(in srgb, var(--bg) 96%, transparent)', backdropFilter: 'blur(12px)' }}>
            <div>
              <div className="text-[10px] font-bold uppercase tracking-[0.14em]" style={{ color: 'var(--violet)' }}>
                Privacy tool {indexLabel ? `· ${indexLabel}` : ''}
              </div>
              <div className="flex items-center gap-2 mt-1">
                <h2 className="text-[18px] sm:text-[22px] font-bold" style={{ color: 'var(--ink)', fontFamily: 'var(--font-paytone)' }}>
                  Blur before upload
                </h2>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowHelp((prev) => !prev)}
                    className="w-7 h-7 rounded-full flex items-center justify-center"
                    style={{ background: 'var(--bg-soft)', color: 'var(--ink-soft)', border: '1px solid var(--line)' }}
                    aria-label="How face blur works"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.25 9a3.75 3.75 0 117.5 0c0 1.59-1.5 2.25-2.25 3M12 17.25h.008v.008H12v-.008z" />
                    </svg>
                  </button>
                  {showHelp && (
                    <div
                      className="absolute right-0 sm:left-0 sm:right-auto top-9 w-56 max-w-[calc(100vw-3rem)] rounded-[14px] px-3 py-3 text-[12px] leading-5 z-10"
                      style={{ background: 'var(--bg-soft)', color: 'var(--ink-soft)', border: '1px solid var(--line)', boxShadow: '0 12px 40px rgba(15,23,42,.14)' }}
                    >
                      Tap once for each face you want blurred. The blur is applied on your device before the photo uploads.
                    </div>
                  )}
                </div>
              </div>
              <p className="text-[12px] sm:text-[13px] mt-1 max-w-xl" style={{ color: 'var(--muted)' }}>
                {helperText}
              </p>
            </div>
            <button
              type="button"
              onClick={onCancel}
              className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
              style={{ background: 'var(--bg-soft)', color: 'var(--ink-soft)', border: '1px solid var(--line)' }}
              aria-label="Cancel face blur editor"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="grid lg:grid-cols-[minmax(0,1fr)_280px]">
            <div className="p-4 md:p-5" style={{ background: 'var(--bg-soft)' }}>
              <div
                className="relative rounded-[20px] overflow-hidden mx-auto"
                style={{ background: 'var(--bg-deep)' }}
                onClick={addRegion}
              >
                {previewUrl && (
                  <>
                    {/* Preview uses a local blob URL before upload, so native img is intentional here. */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      ref={imageRef}
                      src={previewUrl}
                      alt="Preview for optional face blur"
                      className="w-full h-auto max-h-[48vh] sm:max-h-[65vh] object-contain mx-auto"
                    />
                    <canvas
                      ref={canvasRef}
                      className="absolute pointer-events-none"
                      style={{
                        left: canvasFrame.left,
                        top: canvasFrame.top,
                        width: canvasFrame.width,
                        height: canvasFrame.height,
                      }}
                    />
                  </>
                )}
              </div>
            </div>

            <div className="px-5 py-5 flex flex-col gap-5">
              <div>
                <div className="text-[12px] font-bold uppercase tracking-[0.14em]" style={{ color: 'var(--muted)' }}>
                  Blur size
                </div>
                <input
                  type="range"
                  min="0.12"
                  max="0.35"
                  step="0.01"
                  value={brushSize}
                  onChange={(event) => setBrushSize(Number(event.target.value))}
                  className="w-full mt-3"
                />
                <p className="text-[12px] mt-2" style={{ color: 'var(--muted)' }}>
                  Current brush: {Math.round(brushSize * 100)}%
                </p>
              </div>

              {error && (
                <div className="rounded-[14px] px-3 py-2 text-[12px] font-medium" style={{ background: 'var(--danger-tint)', color: 'var(--danger)' }}>
                  {error}
                </div>
              )}

              <div className="flex flex-col gap-2 mt-auto">
                <button
                  type="button"
                  onClick={handleApply}
                  disabled={saving}
                  className="w-full py-3 rounded-[14px] text-sm font-bold text-white disabled:opacity-60"
                  style={{ background: 'var(--ink)' }}
                >
                  {saving ? 'Applying blur…' : regions.length ? 'Apply blur and upload' : 'Upload with no blur'}
                </button>
                <button
                  type="button"
                  onClick={onUseOriginal}
                  disabled={saving}
                  className="w-full py-3 rounded-[14px] text-sm font-semibold"
                  style={{ background: 'var(--bg-soft)', color: 'var(--ink-soft)', border: '1px solid var(--line)' }}
                >
                  Skip blur for this photo
                </button>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setRegions((prev) => prev.slice(0, -1))}
                    disabled={!regions.length || saving}
                    className="flex-1 py-2.5 rounded-[12px] text-sm font-semibold disabled:opacity-50"
                    style={{ background: 'white', color: 'var(--ink-soft)', border: '1px solid var(--line)' }}
                  >
                    Undo
                  </button>
                  <button
                    type="button"
                    onClick={() => setRegions([])}
                    disabled={!regions.length || saving}
                    className="flex-1 py-2.5 rounded-[12px] text-sm font-semibold disabled:opacity-50"
                    style={{ background: 'white', color: 'var(--ink-soft)', border: '1px solid var(--line)' }}
                  >
                    Clear
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
