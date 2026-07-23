import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/seo';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/mods/', '/authors/', '/collections/', '/discover'],
        disallow: [
          '/admin/',
          '/creator/',
          '/profile/',
          '/notifications/',
          '/login',
          '/register',
          '/api/',
          '/*?*commentSuccess=',
          '/*?*reviewSuccess=',
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
