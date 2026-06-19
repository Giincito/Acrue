import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Acrue',
    short_name: 'Acrue',
    description: 'It all adds up.',
    start_url: '/',
    display: 'standalone',
    background_color: '#0C0C0B',
    theme_color: '#0C0C0B',
    icons: [
      {
        src: '/icons/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/icons/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/icons/icon-180.png',
        sizes: '180x180',
        type: 'image/png',
      },
      {
        src: '/icons/icon-167.png',
        sizes: '167x167',
        type: 'image/png',
      },
    ],
  }
}
