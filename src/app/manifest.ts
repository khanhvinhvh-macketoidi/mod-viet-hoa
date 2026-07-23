import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/',
    name: 'MOD Việt Hóa – Mod và bản Việt hóa game',
    short_name: 'MOD Việt Hóa',
    description:
      'Thư viện mod, bản Việt hóa và công cụ hỗ trợ game dành cho cộng đồng Việt Nam.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'any',
    background_color: '#020617',
    theme_color: '#06101d',
    lang: 'vi',
    categories: ['games', 'entertainment', 'utilities'],
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
      {
        src: '/icons/icon-512-maskable.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  };
}
