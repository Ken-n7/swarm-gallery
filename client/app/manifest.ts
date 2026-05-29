import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Swarm Gallery',
    short_name: 'Swarm',
    description: "Your event. Everyone's gallery.",
    start_url: '/',
    display: 'standalone',
    background_color: '#0f0d1f',
    theme_color: '#7c3aed',
    orientation: 'any',
    icons: [
      {
        src: '/logo.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/logo-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  };
}
