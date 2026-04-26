'use client';

import { useRef, useState } from 'react';
import { Photo } from '@/types';
import { photoUrl, uploadPhotoWithProgress } from '@/lib/api';

interface UploadItem {
  id: string;
  name: string;
  size: string;
  progress: number;
  status: 'uploading' | 'done' | 'error';
}

interface Props {
  username: string;
  photos: Photo[];
}

function fmtSize(bytes: number) {
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

export function UploadPanel({ username, photos }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploads, setUploads] = useState<UploadItem[]>([]);
  const [dragging, setDragging] = useState(false);

  const myPhotos = photos.filter((p) => p.uploader === username);

  function updateItem(id: string, patch: Partial<UploadItem>) {
    setUploads((prev) => prev.map((u) => (u.id === id ? { ...u, ...patch } : u)));
  }

  async function handleFiles(files: FileList | File[]) {
    const arr = Array.from(files).filter((f) => f.type.startsWith('image/'));
    if (!arr.length) return;

    const items: UploadItem[] = arr.map((f) => ({
      id: `${Date.now()}-${Math.random()}`,
      name: f.name,
      size: fmtSize(f.size),
      progress: 0,
      status: 'uploading',
    }));

    setUploads((prev) => [...items, ...prev]);

    for (const [i, file] of arr.entries()) {
      const item = items[i];
      try {
        await uploadPhotoWithProgress(file, username, (pct) => {
          updateItem(item.id, { progress: pct });
        });
        updateItem(item.id, { status: 'done', progress: 100 });
      } catch {
        updateItem(item.id, { status: 'error' });
      }
    }
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    if (e.dataTransfer.files) handleFiles(e.dataTransfer.files);
  }

  return (
    <div
      className="h-full overflow-y-auto flex flex-col gap-5 p-5 shrink-0"
      style={{ width: 290, background: 'var(--bg-soft)', borderLeft: '1px solid var(--line)' }}
    >
      {/* Section title */}
      <h2 className="text-[15px] font-bold text-[var(--ink)]">Upload Photos</h2>

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

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
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
                </div>
                <span
                  className="text-[10px] font-semibold shrink-0"
                  style={{
                    color: u.status === 'done' ? 'var(--good)' : u.status === 'error' ? 'var(--danger)' : 'var(--muted)',
                  }}
                >
                  {u.status === 'done' ? 'Done' : u.status === 'error' ? 'Error' : `${u.progress}%`}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* My photos */}
      {myPhotos.length > 0 && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--muted)]">
              My Photos ({myPhotos.length})
            </p>
            <button className="text-[11px] font-semibold text-[var(--violet)]">View all</button>
          </div>
          <div className="grid grid-cols-4 gap-1">
            {myPhotos.slice(0, 8).map((p) => (
              <div key={p.id} className="aspect-square rounded-lg overflow-hidden">
                <img src={photoUrl(p.url)} alt="" className="w-full h-full object-cover" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Download buttons */}
      <div className="flex flex-col gap-2 mt-auto pt-2">
        <button
          className="w-full py-3 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2"
          style={{ background: 'var(--ink)' }}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
          </svg>
          Download my album
        </button>
        <button
          className="w-full py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2"
          style={{ background: 'var(--violet-tint)', color: 'var(--violet-dark)' }}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
          </svg>
          Full gallery (ZIP)
        </button>
      </div>
    </div>
  );
}
