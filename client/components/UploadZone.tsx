'use client';

import { useRef, useState } from 'react';
import { uploadPhoto } from '@/lib/api';

interface Props {
  username: string;
}

export function UploadZone({ username }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
    setError('');
    try {
      for (const file of Array.from(files)) {
        const res = await uploadPhoto(file, username);
        if (!res.ok) setError('Upload failed');
      }
    } catch {
      setError('Upload failed');
    } finally {
      setUploading(false);
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    handleFiles(e.dataTransfer.files);
  }

  return (
    <div
      onDrop={handleDrop}
      onDragOver={(e) => e.preventDefault()}
      onClick={() => inputRef.current?.click()}
      className="flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-zinc-200 p-8 cursor-pointer hover:border-zinc-400 transition-colors select-none"
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        capture="environment"
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
      {uploading ? (
        <p className="text-sm text-zinc-500">Uploading...</p>
      ) : (
        <>
          <p className="text-sm font-medium text-zinc-700">Tap to add photos</p>
          <p className="text-xs text-zinc-400">or drag & drop</p>
        </>
      )}
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}
