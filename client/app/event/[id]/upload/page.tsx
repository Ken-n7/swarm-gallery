'use client';

import Image from 'next/image';
import { useState, useRef, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { uploadPhotoWithProgress, photoUrl, SERVER } from '@/lib/api';
import { useUser } from '@/hooks/useUser';
import { useGuestPreferences } from '@/hooks/useGuestPreferences';
import { useFaceBlurWorkflow } from '@/hooks/useFaceBlurWorkflow';
import { FaceBlurEditor } from '@/components/FaceBlurEditor';
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
  error?: string;
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

  useEffect(() => {
    return () => {
      setQueue((prev) => {
        prev.forEach((item) => URL.revokeObjectURL(item.previewUrl));
        return prev;
      });
    };
  }, []);

  function updateItem(id: string, patch: Partial<QueueItem>) {
    setQueue((prev) => prev.map((q) => (q.id === id ? { ...q, ...patch } : q)));
  }

  function removeItem(id: string) {
    setQueue((prev) => {
      const item = prev.find((entry) => entry.id === id);
      if (item) URL.revokeObjectURL(item.previewUrl);
      return prev.filter((entry) => entry.id !== id);
    });
  }

  async function uploadItem(item: QueueItem) {
    if (!user) return;
    updateItem(item.id, { status: 'uploading', progress: 0, error: undefined });

    try {
      const saved = await uploadPhotoWithProgress(item.file, user.username, (pct) => {
        updateItem(item.id, { progress: pct });
      });
      updateItem(item.id, { status: 'done', progress: 100 });
      setMyPhotos((prev) => (prev.some((photo) => photo.id === saved.id) ? prev : [saved, ...prev]));
    } catch {
      updateItem(item.id, {
        status: 'error',
        error: 'Upload failed. Check your connection and retry.',
      });
    }
  }

  function retryItem(id: string) {
    const item = queue.find((entry) => entry.id === id);
    if (!item || item.status !== 'error') return;
    void uploadItem(item);
  }

  async function enqueue(files: FileList | File[]) {
    if (!user) return;
    const selected = Array.from(files).filter(
      (f) => f.type.startsWith('image/') || f.type.startsWith('video/')
    );
    if (!selected.length) return;

    const arr = await prepareFiles(selected);
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
      await uploadItem(item);
    }
  }

  const uploading = queue.some((q) => q.status === 'uploading');
  const allDone   = queue.length > 0 && queue.every((q) => q.status === 'done');
  const failedCount = queue.filter((q) => q.status === 'error').length;

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
        {faceBlurEnabled && (
          <div className="rounded-[16px] px-4 py-3 flex items-start gap-3" style={{ background: 'var(--violet-tint)', border: '1px solid rgba(139,92,246,.18)' }}>
            <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0" style={{ background: 'white', color: 'var(--violet)' }}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M3.98 8.223A10.477 10.477 0 0112 5.25c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7a10.523 10.523 0 012.214-3.592M3 3l18 18" />
              </svg>
            </div>
            <div>
              <div className="text-[13px] font-semibold" style={{ color: 'var(--ink)' }}>Face blur is on</div>
              <p className="text-[12px] mt-1" style={{ color: 'var(--ink-soft)' }}>
                Photos pause for a quick on-device blur step before upload. Videos upload unchanged.
              </p>
            </div>
          </div>
        )}

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
              {(allDone || failedCount > 0) && (
                <button
                  onClick={() => {
                    queue.forEach((item) => URL.revokeObjectURL(item.previewUrl));
                    setQueue([]);
                  }}
                  className="text-[11px] font-semibold"
                  style={{ color: 'var(--violet)' }}
                >
                  Clear all
                </button>
              )}
            </div>
            {failedCount > 0 && (
              <div className="rounded-[12px] px-3 py-2 text-[12px] font-medium" style={{ background: 'var(--danger-tint)', color: 'var(--danger)' }}>
                {failedCount} {failedCount === 1 ? 'upload needs' : 'uploads need'} attention. Retry failed items or remove them from the queue.
              </div>
            )}
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
                      // Preview uses a local blob URL before the file is uploaded.
                      // eslint-disable-next-line @next/next/no-img-element
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
                    {item.status === 'error' && item.error && (
                      <p className="text-[10px] mt-1" style={{ color: 'var(--danger)' }}>{item.error}</p>
                    )}
                  </div>

                  <div className="shrink-0 flex flex-col items-end gap-1">
                    <span
                      className="text-[11px] font-bold"
                      style={{
                        color: item.status === 'done' ? 'var(--good)'
                             : item.status === 'error' ? 'var(--danger)'
                             : 'var(--muted)',
                      }}
                    >
                      {item.status === 'done' ? '✓' : item.status === 'error' ? 'Error' : `${item.progress}%`}
                    </span>
                    {item.status === 'error' && (
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => retryItem(item.id)}
                          className="text-[10px] font-semibold"
                          style={{ color: 'var(--violet)' }}
                        >
                          Retry
                        </button>
                        <button
                          type="button"
                          onClick={() => removeItem(item.id)}
                          className="text-[10px] font-semibold"
                          style={{ color: 'var(--muted)' }}
                        >
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
                  target="_blank"
                  rel="noreferrer"
                  className="text-[11px] font-semibold"
                  style={{ color: 'var(--violet)' }}
                >
                  Download / open all
                </a>
              )}
            </div>
            <div className="grid grid-cols-4 gap-1.5">
              {myPhotos.map((p) => (
                <div key={p.id} className="aspect-square rounded-[10px] overflow-hidden relative" style={{ background: 'var(--violet-tint)' }}>
                  {p.mimetype?.startsWith('video/') ? (
                    <>
                      {p.thumbUrl
                        ? <Image src={photoUrl(p.thumbUrl)} alt="" fill unoptimized sizes="25vw" className="object-cover" />
                        : <div className="w-full h-full" style={{ background: 'var(--ink)' }} />
                      }
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: 'rgba(0,0,0,.45)' }}>
                          <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M8 5v14l11-7z" />
                          </svg>
                        </div>
                      </div>
                    </>
                  ) : p.url ? (
                    <Image src={photoUrl(p.url)} alt="" fill unoptimized sizes="25vw" className="object-cover" />
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
