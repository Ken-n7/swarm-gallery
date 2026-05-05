'use client';

import { useEffect, useMemo, useState } from 'react';

interface SessionState {
  files: File[];
  processed: File[];
  index: number;
  resolve: (files: File[]) => void;
}

function isImageFile(file: File) {
  return file.type.startsWith('image/');
}

export function useFaceBlurWorkflow(enabled: boolean) {
  const [session, setSession] = useState<SessionState | null>(null);

  const currentFile = useMemo(() => {
    if (!session) return null;
    return session.files[session.index] || null;
  }, [session]);

  useEffect(() => {
    if (!session || !currentFile) return;
    if (!isImageFile(currentFile)) {
      advanceWithFile(currentFile);
    }
  }, [session, currentFile]);

  function finishSession(files: File[]) {
    setSession((prev) => {
      if (!prev) return prev;
      prev.resolve(files);
      return null;
    });
  }

  function advanceWithFile(file: File) {
    setSession((prev) => {
      if (!prev) return prev;

      const processed = [...prev.processed, file];
      const nextIndex = prev.index + 1;

      if (nextIndex >= prev.files.length) {
        prev.resolve(processed);
        return null;
      }

      return {
        ...prev,
        processed,
        index: nextIndex,
      };
    });
  }

  function prepareFiles(files: File[]) {
    if (!enabled) return Promise.resolve(files);
    if (!files.some(isImageFile)) return Promise.resolve(files);

    return new Promise<File[]>((resolve) => {
      setSession({
        files,
        processed: [],
        index: 0,
        resolve,
      });
    });
  }

  function useOriginalFile() {
    if (!currentFile) return;
    advanceWithFile(currentFile);
  }

  function applyBlurredFile(file: File) {
    advanceWithFile(file);
  }

  function cancelWorkflow() {
    finishSession([]);
  }

  return {
    currentFile: currentFile && isImageFile(currentFile) ? currentFile : null,
    currentIndex: session ? session.index + 1 : 0,
    totalFiles: session?.files.length ?? 0,
    prepareFiles,
    useOriginalFile,
    applyBlurredFile,
    cancelWorkflow,
  };
}
