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
        src: '/icon.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  }
}
