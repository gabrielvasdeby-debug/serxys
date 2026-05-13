import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Servyx Intelligence',
    short_name: 'Servyx',
    description: 'Sistema de gestão para prestadores de serviços',
    start_url: '/',
    display: 'standalone',
    background_color: '#020202',
    theme_color: '#121212',
    icons: [
      {
        src: '/logo.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/logo.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  }
}
