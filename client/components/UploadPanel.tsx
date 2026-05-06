'use client';

import { useRef, useState } from 'react';
import { Photo } from '@/types';
import { uploadPhotoWithProgress, SERVER } from '@/lib/api';
import { useGuestPreferences } from '@/hooks/useGuestPreferences';
import { useFaceBlurWorkflow } from '@/hooks/useFaceBlurWorkflow';
import { FaceBlurEditor } from './FaceBlurEditor';

interface UploadItem {
  id: string;
  file: File;
  name: string;
  size: string;
  progress: number;
  status: 'uploading' | 'done' | 'error';
  error?: string;
}

interface Props {
  username: string;
  userId: string;
  photos: Photo[];
  eventId?: string;
  compact?: boolean;
  sheetMode?: boolean;
}

function fmtSize(bytes: number) {
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

export function UploadPanel({ username, userId, photos, eventId = 'demo', compact = false, sheetMode = false }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploads, setUploads] = useState<UploadItem[]>([]);
  const [dragging, setDragging] = useState(false);
  const { faceBlurEnabled } = useGuestPreferences();
  const {
    currentFile: blurFile,
    currentIndex: blurIndex,
    totalFiles: blurTotal,
    prepareFiles,
    useOriginalFile,
    applyBlurredFile,
    cancelWorkflow,
  } = useFaceBlurWorkflow(faceBlurEnabled);

  const myPhotos = photos.filter((p) => p.uploader === username);
  const queueSummary = uploads.length
    ? uploads.some((item) => item.status === 'uploading')
      ? 'Uploads are moving. You can keep browsing while this panel updates.'
      : uploads.some((item) => item.status === 'error')
        ? 'Some items need attention before they finish.'
        : 'Everything in the queue finished successfully.'
    : 'Drop files, browse the device, or keep capturing moments while the gallery stays live.';

  function updateItem(id: string, patch: Partial<UploadItem>) {
    setUploads((prev) => prev.map((u) => (u.id === id ? { ...u, ...patch } : u)));
  }

  async function uploadItem(item: UploadItem) {
    updateItem(item.id, { status: 'uploading', progress: 0, error: undefined });

    try {
      await uploadPhotoWithProgress(item.file, username, (pct) => {
        updateItem(item.id, { progress: pct });
      });
      updateItem(item.id, { status: 'done', progress: 100 });
    } catch {
      updateItem(item.id, {
        status: 'error',
        error: 'Upload failed. Please retry.',
      });
    }
  }

  function retryItem(id: string) {
    const item = uploads.find((entry) => entry.id === id);
    if (!item || item.status !== 'error') return;
    void uploadItem(item);
  }

  function removeItem(id: string) {
    setUploads((prev) => prev.filter((entry) => entry.id !== id));
  }

  async function handleFiles(files: FileList | File[]) {
    const selected = Array.from(files).filter((f) => f.type.startsWith('image/') || f.type.startsWith('video/'));
    if (!selected.length) return;

    const arr = await prepareFiles(selected);
    if (!arr.length) return;

    const items: UploadItem[] = arr.map((f) => ({
      id: `${Date.now()}-${Math.random()}`,
      file: f,
      name: f.name,
      size: fmtSize(f.size),
      progress: 0,
      status: 'uploading',
    }));

    setUploads((prev) => [...items, ...prev]);

    for (const [i, file] of arr.entries()) {
      const item = { ...items[i], file };
      await uploadItem(item);
    }
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    if (e.dataTransfer.files) handleFiles(e.dataTransfer.files);
  }

  return (
    <div
      className={`overflow-y-auto flex flex-col shrink-0 ${compact ? 'gap-3 p-3.5' : 'gap-4 lg:gap-5 p-4 lg:p-5'} ${sheetMode ? 'h-auto min-h-0' : 'h-full'}`}
      style={{
        width: sheetMode ? '100%' : compact ? 'clamp(188px, 24vw, 240px)' : 'clamp(220px, 28vw, 290px)',
        background: sheetMode ? 'transparent' : 'var(--bg-soft)',
        borderLeft: sheetMode ? 'none' : '1px solid var(--line)',
      }}
    >
      {/* Section title */}
      <div>
        <h2 className="text-[15px] font-bold text-[var(--ink)]">Upload Photos</h2>
        <p className="text-[11px] mt-1 leading-5" style={{ color: 'var(--muted)' }}>{queueSummary}</p>
      </div>

      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className="flex flex-col items-center gap-3 rounded-2xl py-7 px-4 transition-colors"
        style={{
          border: `1.5px dashed ${dragging ? 'var(--violet)' : 'var(--line)'}`,
          background: dragging ? 'var(--violet-tint)' : 'white',
        }}
      >
        <svg className="w-7 h-7 text-[var(--violet)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
        </svg>
        <p className="text-sm text-[var(--ink-soft)] text-center">
          Drop files here<br />
          <span className="text-xs text-[var(--muted)]">JPG, PNG · up to 50 MB</span>
        </p>
        <button
          onClick={() => inputRef.current?.click()}
          className="px-5 py-2 rounded-full text-sm font-bold text-white"
          style={{ background: 'var(--ink)' }}
        >
          Browse
        </button>
      </div>

      {faceBlurEnabled && (
        <div className="rounded-2xl px-4 py-3" style={{ background: 'var(--violet-tint)', border: '1px solid rgba(139,92,246,.18)' }}>
          <div className="text-[12px] font-semibold" style={{ color: 'var(--ink)' }}>Face blur is on</div>
          {!compact && (
            <p className="text-[11px] mt-1 leading-5" style={{ color: 'var(--ink-soft)' }}>
              Selected photos open a quick blur step before upload. Videos keep uploading normally.
            </p>
          )}
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*,video/*"
        multiple
        className="hidden"
        onChange={(e) => e.target.files && handleFiles(e.target.files)}
      />

      {/* In progress */}
      {uploads.length > 0 && (
        <div className="flex flex-col gap-1">
          <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--muted)]">In Progress</p>
          <div className="flex flex-col gap-2">
            {uploads.slice(0, 5).map((u) => (
              <div key={u.id} className="flex items-center gap-3 py-2">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: 'var(--bg-deep)' }}
                >
                  <svg className="w-4 h-4 text-[var(--muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5z" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-[var(--ink)] truncate">{u.name}</p>
                  <p className="text-[10px] text-[var(--muted)]">{u.size}</p>
                  {u.status === 'uploading' && (
                    <div className="mt-1 h-0.5 rounded-full overflow-hidden" style={{ background: 'var(--line)' }}>
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${u.progress}%`, background: 'var(--violet)' }}
                      />
                    </div>
                  )}
                  {u.status === 'error' && u.error && (
                    <p className="text-[10px] mt-1" style={{ color: 'var(--danger)' }}>{u.error}</p>
                  )}
                </div>
                <div className="shrink-0 flex flex-col items-end gap-1">
                  <span
                    className="text-[10px] font-semibold"
                    style={{
                      color: u.status === 'done' ? 'var(--good)' : u.status === 'error' ? 'var(--danger)' : 'var(--muted)',
                    }}
                  >
                    {u.status === 'done' ? 'Done' : u.status === 'error' ? 'Error' : `${u.progress}%`}
                  </span>
                  {u.status === 'error' && (
                    <div className="flex gap-2">
                      <button type="button" onClick={() => retryItem(u.id)} className="text-[10px] font-semibold" style={{ color: 'var(--violet)' }}>
                        Retry
                      </button>
                      <button type="button" onClick={() => removeItem(u.id)} className="text-[10px] font-semibold" style={{ color: 'var(--muted)' }}>
                        Remove
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Download my album */}
      {myPhotos.length > 0 && (
        <div className="mt-auto pt-2">
          <a
            href={`${SERVER}/users/${userId}/album?eventId=${eventId}`}
            download="my-album.zip"
            target="_blank"
            rel="noreferrer"
            className="w-full py-3 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2"
            style={{ background: 'var(--ink)' }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
            Download / open my album
          </a>
        </div>
      )}

      {myPhotos.length === 0 && uploads.length === 0 && (
        <div className="mt-auto rounded-2xl px-4 py-4" style={{ background: 'white', border: '1px solid var(--line)' }}>
          <div className="text-[12px] font-semibold" style={{ color: 'var(--ink)' }}>No uploads from you yet</div>
          <p className="text-[11px] mt-1 leading-5" style={{ color: 'var(--muted)' }}>
            Start with a photo or video and use the Mine tab in the gallery to review your uploads.
          </p>
        </div>
      )}

      <FaceBlurEditor
        key={blurFile ? `${blurFile.name}-${blurFile.size}-${blurFile.lastModified}` : 'face-blur-closed'}
        open={!!blurFile}
        file={blurFile}
        indexLabel={blurTotal > 1 ? `${blurIndex} of ${blurTotal}` : undefined}
        onCancel={cancelWorkflow}
        onUseOriginal={useOriginalFile}
        onApply={applyBlurredFile}
      />
    </div>
  );
}
