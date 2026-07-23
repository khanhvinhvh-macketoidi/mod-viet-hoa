import type { MetadataRoute } from 'next';
import { getCollections } from '@/lib/collections';
import { getMods } from '@/lib/mods';
import { getUsers } from '@/lib/users';
import { SITE_URL } from '@/lib/seo';

export const dynamic = 'force-dynamic';

function safeDate(value?: string): Date {
  const date = value ? new Date(value) : new Date();
  return Number.isNaN(date.getTime()) ? new Date() : date;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [mods, users, collections] = await Promise.all([
    getMods(),
    getUsers(),
    getCollections(),
  ]);

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: SITE_URL, lastModified: new Date(), changeFrequency: 'daily', priority: 1 },
    { url: `${SITE_URL}/mods`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
    { url: `${SITE_URL}/discover`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.8 },
    { url: `${SITE_URL}/feed`, lastModified: new Date(), changeFrequency: 'hourly', priority: 0.7 },
    { url: `${SITE_URL}/community-guidelines`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.3 },
    { url: `${SITE_URL}/contact`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.3 },
    { url: `${SITE_URL}/copyright`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.3 },
  ];

  const modRoutes: MetadataRoute.Sitemap = mods.map((mod) => ({
    url: `${SITE_URL}/mods/${encodeURIComponent(mod.slug)}`,
    lastModified: safeDate(mod.updatedAt || mod.createdAt),
    changeFrequency: 'weekly',
    priority: 0.8,
    images: mod.coverUrl ? [new URL(mod.coverUrl, SITE_URL).toString()] : undefined,
  }));

  const authorRoutes: MetadataRoute.Sitemap = users
    .filter((user) => user.isActive !== false && user.profileSlug)
    .map((user) => ({
      url: `${SITE_URL}/authors/${encodeURIComponent(user.profileSlug!)}`,
      lastModified: safeDate(user.updatedAt || user.createdAt),
      changeFrequency: 'weekly',
      priority: 0.6,
    }));

  const collectionRoutes: MetadataRoute.Sitemap = collections
    .filter(
      (collection) =>
        collection.visibility === 'PUBLIC' &&
        collection.moderationStatus !== 'HIDDEN',
    )
    .map((collection) => ({
      url: `${SITE_URL}/collections/${encodeURIComponent(collection.slug)}`,
      lastModified: safeDate(collection.updatedAt || collection.createdAt),
      changeFrequency: 'weekly',
      priority: 0.6,
    }));

  return [...staticRoutes, ...modRoutes, ...authorRoutes, ...collectionRoutes];
}
