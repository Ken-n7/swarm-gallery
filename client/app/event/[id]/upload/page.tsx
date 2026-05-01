'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { uploadPhotoWithProgress, photoUrl, SERVER } from '@/lib/api';
import { useUser } from '@/hooks/useUser';
import { Photo } from '@/types';

interface QueueItem {
  id: string;
  file: File;
  name: string;
  size: string;
  isVideo: boolean;
  previewUrl: string;
  progress: number;
  status: 'uploading' | 'done' | 'error';
}

function fmtSize(bytes: number) {
  if (bytes >= 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  return (bytes / 1024).toFixed(0) + ' KB';
}

export default function UploadPage() {
  const router = useRouter();
  const params = useParams();
  const eventId = (params.id as string) || 'demo';
  const { user } = useUser();

  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [myPhotos, setMyPhotos] = useState<Photo[]>([]);

  const photoRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLInputElement>(null);
  const filesRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) return;
    fetch(`${SERVER}/photos-list/${eventId}`)
      .then((r) => r.json())
      .then((all: Photo[]) => setMyPhotos(all.filter((p) => p.uploader === user.username)))
      .catch(() => {});
  }, [user, eventId]);

  function updateItem(id: string, patch: Partial<QueueItem>) {
    setQueue((prev) => prev.map((q) => (q.id === id ? { ...q, ...patch } : q)));
  }

  async function enqueue(files: FileList | File[]) {
    if (!user) return;
    const arr = Array.from(files).filter(
      (f) => f.type.startsWith('image/') || f.type.startsWith('video/')
    );
    if (!arr.length) return;

    const items: QueueItem[] = arr.map((f) => ({
      id: `${Date.now()}-${Math.random()}`,
      file: f,
      name: f.name,
      size: fmtSize(f.size),
      isVideo: f.type.startsWith('video/'),
      previewUrl: URL.createObjectURL(f),
      progress: 0,
      status: 'uploading',
    }));

    setQueue((prev) => [...items, ...prev]);

    for (const item of items) {
      try {
        await uploadPhotoWithProgress(item.file, user.username, (pct) => {
          updateItem(item.id, { progress: pct });
        });
        updateItem(item.id, { status: 'done', progress: 100 });
        // Add to my photos on success
        setMyPhotos((prev) => [
          { id: item.id, filename: item.name, url: '', uploadedAt: Date.now(), uploader: user.username },
          ...prev,
        ]);
      } catch {
        updateItem(item.id, { status: 'error' });
      }
    }
  }

  const uploading = queue.some((q) => q.status === 'uploading');
  const allDone   = queue.length > 0 && queue.every((q) => q.status === 'done');

  return (
    <div className="flex flex-col min-h-screen" style={{ background: 'var(--bg)' }}>
      {/* Header */}
      <header className="flex items-center gap-4 px-4 pt-6 pb-4">
        <button
          onClick={() => router.back()}
          className="w-9 h-9 rounded-full flex items-center justify-center border"
          style={{ borderColor: 'var(--line)' }}
        >
          <svg className="w-5 h-5 text-[var(--ink-soft)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-[22px] font-bold text-[var(--ink)]" style={{ fontFamily: 'var(--font-paytone)' }}>
          Add Media
        </h1>
      </header>

      <div className="flex-1 flex flex-col px-5 gap-5 pb-28">

        {/* Action buttons — always visible */}
        <div className="flex flex-col gap-3">
          <div className="flex gap-3">
            <button
              onClick={() => photoRef.current?.click()}
              className="flex-1 py-4 rounded-[14px] flex items-center justify-center gap-2 text-[15px] font-semibold text-white"
              style={{ background: 'var(--ink)' }}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" />
              </svg>
              Take photo
            </button>
            <button
              onClick={() => videoRef.current?.click()}
              className="flex-1 py-4 rounded-[14px] flex items-center justify-center gap-2 text-[15px] font-semibold text-white"
              style={{ background: 'var(--ink)' }}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" />
              </svg>
              Record video
            </button>
          </div>
          <button
            onClick={() => filesRef.current?.click()}
            disabled={uploading}
            className="w-full py-4 rounded-[14px] flex items-center justify-center gap-2 text-[15px] font-semibold border disabled:opacity-50"
            style={{ borderColor: 'var(--violet)', borderWidth: 1.5, color: 'var(--violet-dark)' }}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
            </svg>
            Select files (multiple)
          </button>
        </div>

        {/* Upload queue */}
        {queue.length > 0 && (
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--muted)', letterSpacing: '0.08em' }}>
                {uploading ? 'Uploading…' : allDone ? 'Done' : 'Queue'}
              </p>
              {allDone && (
                <button
                  onClick={() => setQueue([])}
                  className="text-[11px] font-semibold"
                  style={{ color: 'var(--violet)' }}
                >
                  Clear
                </button>
              )}
            </div>
            <div className="flex flex-col gap-2">
              {queue.map((item) => (
                <div key={item.id} className="flex items-center gap-3 rounded-[12px] p-3" style={{ background: 'white', border: '1px solid var(--line)' }}>
                  {/* Thumbnail or video icon */}
                  <div className="w-11 h-11 rounded-[8px] overflow-hidden shrink-0 flex items-center justify-center" style={{ background: 'var(--violet-tint)' }}>
                    {item.isVideo ? (
                      <svg className="w-5 h-5 text-[var(--violet)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" />
                      </svg>
                    ) : (
                      <img src={item.previewUrl} alt="" className="w-full h-full object-cover" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-semibold text-[var(--ink)] truncate">{item.name}</p>
                    <p className="text-[10px] text-[var(--muted)]">{item.size}</p>
                    {item.status === 'uploading' && (
                      <div className="mt-1 h-1 rounded-full overflow-hidden" style={{ background: 'var(--line)' }}>
                        <div
                          className="h-full rounded-full transition-all duration-100"
                          style={{ width: `${item.progress}%`, background: 'var(--neon-gradient)' }}
                        />
                      </div>
                    )}
                  </div>

                  <span
                    className="text-[11px] font-bold shrink-0"
                    style={{
                      color: item.status === 'done' ? 'var(--good)'
                           : item.status === 'error' ? 'var(--danger)'
                           : 'var(--muted)',
                    }}
                  >
                    {item.status === 'done' ? '✓' : item.status === 'error' ? 'Error' : `${item.progress}%`}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* My Photos grid */}
        {myPhotos.length > 0 && (
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--muted)', letterSpacing: '0.08em' }}>
                My Media ({myPhotos.length})
              </p>
              {user && (
                <a
                  href={`${SERVER}/users/${user.userId}/album?eventId=${eventId}`}
                  download="my-album.zip"
                  className="text-[11px] font-semibold"
                  style={{ color: 'var(--violet)' }}
                >
                  Download all
                </a>
              )}
            </div>
            <div className="grid grid-cols-4 gap-1.5">
              {myPhotos.map((p) => (
                <div key={p.id} className="aspect-square rounded-[10px] overflow-hidden relative" style={{ background: 'var(--violet-tint)' }}>
                  {p.mimetype?.startsWith('video/') ? (
                    <div className="w-full h-full flex items-center justify-center">
                      <svg className="w-5 h-5 text-[var(--violet)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" />
                      </svg>
                    </div>
                  ) : p.url ? (
                    <img src={photoUrl(p.url)} alt="" className="w-full h-full object-cover" />
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty state */}
        {queue.length === 0 && myPhotos.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-3 py-12">
            <div
              className="w-20 h-20 rounded-[20px] flex items-center justify-center"
              style={{ background: 'var(--violet-tint)', border: '2px dashed var(--violet)' }}
            >
              <svg className="w-8 h-8 text-[var(--violet)]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
              </svg>
            </div>
            <p className="text-[13px] text-[var(--muted)] text-center">No media yet — tap above to share</p>
          </div>
        )}
      </div>

      <input ref={photoRef} type="file" accept="image/*" capture="environment" className="hidden"
        onChange={(e) => e.target.files && enqueue(e.target.files)} />
      <input ref={videoRef} type="file" accept="video/*" capture="environment" className="hidden"
        onChange={(e) => e.target.files && enqueue(e.target.files)} />
      <input ref={filesRef} type="file" accept="image/*,video/*" multiple className="hidden"
        onChange={(e) => e.target.files && enqueue(e.target.files)} />
    </div>
  );
}
