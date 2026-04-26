'use client';

import Image from 'next/image';
import { Photo } from '@/types';
import { photoUrl } from '@/lib/api';

interface Props {
  photos: Photo[];
}

export function Gallery({ photos }: Props) {
  if (photos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-zinc-400">
        <p className="text-sm">No photos yet. Be the first to upload!</p>
      </div>
    );
  }

  return (
    <div className="columns-2 sm:columns-3 lg:columns-4 gap-2 p-4">
      {photos.map((photo) => (
        <div key={photo.id} className="mb-2 break-inside-avoid rounded-xl overflow-hidden relative group">
          <Image
            src={photoUrl(photo.url)}
            alt={`Photo by ${photo.uploader}`}
            width={600}
            height={800}
            className="w-full h-auto object-cover"
            unoptimized
          />
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent px-3 py-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <p className="text-xs text-white font-medium">{photo.uploader}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
