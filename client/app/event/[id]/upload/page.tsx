'use client';

import { useState, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { uploadPhoto } from '@/lib/api';
import { useUser } from '@/hooks/useUser';

export default function UploadPage() {
  const router = useRouter();
  const { user } = useUser();

  const [preview, setPreview] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);

  function handleFile(f: File | null) {
    if (!f) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setError('');
  }

  async function handleUpload() {
    if (!file || !user) return;
    setUploading(true);
    setError('');
    try {
      const res = await uploadPhoto(file, user.username);
      if (!res.ok) throw new Error();
      router.back();
    } catch {
      setError('Upload failed. Try again.');
    } finally {
      setUploading(false);
    }
  }

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
          Add Photo
        </h1>
      </header>

      <div className="flex-1 flex flex-col items-center px-5">
        {!preview ? (
          /* Empty state */
          <div className="flex-1 flex flex-col items-center justify-center gap-6 w-full">
            {/* Illustration */}
            <div
              className="w-32 h-32 rounded-[32px] flex flex-col items-center justify-center gap-2"
              style={{
                background: 'var(--violet-tint)',
                border: '2px dashed var(--violet)',
              }}
            >
              <svg className="w-10 h-10 text-[var(--violet)]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" />
              </svg>
              <p className="text-[11px] font-semibold text-[var(--violet)]">No photo yet</p>
            </div>

            <div className="text-center">
              <h2 className="text-[17px] font-semibold text-[var(--ink)]">Share a moment</h2>
              <p className="text-[13px] text-[var(--muted)] mt-1 leading-relaxed max-w-[22ch] mx-auto">
                Take or choose a photo to add to the event gallery
              </p>
            </div>

            <div className="flex flex-col gap-3 w-full">
              <button
                onClick={() => cameraRef.current?.click()}
                className="w-full py-4 rounded-[14px] flex items-center justify-center gap-2 text-[15px] font-semibold text-white"
                style={{ background: 'var(--ink)' }}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" />
                </svg>
                Take photo
              </button>
              <button
                onClick={() => galleryRef.current?.click()}
                className="w-full py-4 rounded-[14px] flex items-center justify-center gap-2 text-[15px] font-semibold border"
                style={{ borderColor: 'var(--violet)', borderWidth: 1.5, color: 'var(--violet-dark)' }}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                </svg>
                Import from gallery
              </button>
            </div>
          </div>
        ) : (
          /* Preview state */
          <div className="flex-1 flex flex-col w-full gap-4 pt-2">
            <img
              src={preview}
              alt="preview"
              className="w-full rounded-[14px] object-cover"
              style={{ maxHeight: '60vh', border: '2px solid var(--violet)' }}
            />

            {error && <p className="text-sm text-[var(--danger)] text-center">{error}</p>}

            <div className="flex flex-col gap-3">
              <button
                onClick={handleUpload}
                disabled={uploading}
                className="w-full py-4 rounded-[14px] flex items-center justify-center gap-2 text-[16px] font-semibold text-white disabled:opacity-50"
                style={{ background: 'var(--ink)' }}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                </svg>
                {uploading ? 'Uploading...' : 'Upload to gallery'}
              </button>
              <button
                onClick={() => { setPreview(null); setFile(null); }}
                className="w-full py-4 rounded-[14px] text-[15px] font-semibold border"
                style={{ borderColor: 'var(--line)', color: 'var(--ink-soft)' }}
              >
                Choose different photo
              </button>
            </div>
          </div>
        )}
      </div>

      <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => handleFile(e.target.files?.[0] ?? null)} />
      <input ref={galleryRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleFile(e.target.files?.[0] ?? null)} />
    </div>
  );
}
