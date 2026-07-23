import fs from 'node:fs/promises';
import path from 'node:path';

import type { User } from '@/lib/types';
import { getModsByAuthorId } from '@/lib/mods';

type LooseMod = {
  id: string;
  title: string;
  slug: string;
  coverUrl?: string;
  downloads?: number;
  viewCount?: number;
  views?: number;
};

type ReviewRecord = { id: string; modId: string; rating: number; createdAt?: string };
type CommentRecord = {
  id: string;
  modId: string;
  createdAt?: string;
  moderationStatus?: 'VISIBLE' | 'HIDDEN' | 'DELETED';
};
type FavoriteRecord = { userId: string; modId: string; createdAt?: string };
type CollectionItemRecord = { collectionId: string; modId: string; createdAt?: string };
type FollowRecord = { id: string; followerId: string; followingId: string; createdAt?: string };
type ModVersionRecord = {
  id: string;
  modId: string;
  version: string;
  downloads?: number;
  createdAt?: string;
  publishedAt?: string;
};

export type CreatorAnalyticsSnapshot = {
  id: string;
  creatorId: string;
  date: string;
  totalDownloads: number;
  totalViews: number;
  totalFavorites: number;
  totalCollections: number;
  totalComments: number;
  totalReviews: number;
  totalFollowers: number;
  createdAt: string;
  updatedAt?: string;
};

export type CreatorAnalyticsOverview = {
  creatorName: string;
  generatedAt: string;
  totals: {
    mods: number;
    downloads: number;
    views: number;
    favorites: number;
    collections: number;
    followers: number;
    reviews: number;
    comments: number;
    averageRating: number;
  };
  snapshots: CreatorAnalyticsSnapshot[];
  topMods: Array<{
    id: string;
    title: string;
    slug: string;
    coverUrl: string;
    downloads: number;
    views: number;
    favorites: number;
    collections: number;
    reviews: number;
    comments: number;
    averageRating: number;
  }>;
  topVersions: Array<{
    id: string;
    modId: string;
    modTitle: string;
    version: string;
    downloads: number;
    publishedAt: string;
  }>;
};

const dataPath = (...parts: string[]) => path.join(process.cwd(), 'data', ...parts);

async function readJsonSafe<T>(fileName: string, fallback: T): Promise<T> {
  try {
    const raw = await fs.readFile(dataPath(fileName), 'utf8');
    return raw.trim() ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

async function writeJsonAtomic(fileName: string, value: unknown): Promise<void> {
  const target = dataPath(fileName);
  const temporary = `${target}.${process.pid}.tmp`;
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
  await fs.rename(temporary, target);
}

function sum(values: number[]): number {
  return values.reduce((total, value) => total + (Number.isFinite(value) ? value : 0), 0);
}

function average(values: number[]): number {
  return values.length ? sum(values) / values.length : 0;
}

function modViews(mod: LooseMod): number {
  return Math.max(0, Number(mod.viewCount ?? mod.views ?? 0) || 0);
}

export async function getCreatorAnalyticsOverview(
  creator: User,
): Promise<CreatorAnalyticsOverview> {
  const mods = (await getModsByAuthorId(creator.id)) as unknown as LooseMod[];
  const modIds = new Set(mods.map((mod) => mod.id));

  const [reviews, commentsRaw, favorites, collectionItems, follows, versions, snapshots] =
    await Promise.all([
      readJsonSafe<ReviewRecord[]>('reviews.json', []),
      readJsonSafe<CommentRecord[]>('comments.json', []),
      readJsonSafe<FavoriteRecord[]>('mod-favorites.json', []),
      readJsonSafe<CollectionItemRecord[]>('collection-items.json', []),
      readJsonSafe<FollowRecord[]>('follows.json', []),
      readJsonSafe<ModVersionRecord[]>('mod-versions.json', []),
      readJsonSafe<CreatorAnalyticsSnapshot[]>('creator-analytics.json', []),
    ]);

  const creatorReviews = reviews.filter((item) => modIds.has(item.modId));
  const comments = commentsRaw.filter(
    (item) =>
      modIds.has(item.modId) &&
      item.moderationStatus !== 'HIDDEN' &&
      item.moderationStatus !== 'DELETED',
  );
  const creatorFavorites = favorites.filter((item) => modIds.has(item.modId));
  const creatorCollectionItems = collectionItems.filter((item) => modIds.has(item.modId));
  const creatorFollowers = follows.filter((item) => item.followingId === creator.id);

  const topMods = mods
    .map((mod) => {
      const modReviews = creatorReviews.filter((item) => item.modId === mod.id);
      return {
        id: mod.id,
        title: mod.title,
        slug: mod.slug,
        coverUrl: mod.coverUrl ?? '',
        downloads: Math.max(0, Number(mod.downloads ?? 0) || 0),
        views: modViews(mod),
        favorites: creatorFavorites.filter((item) => item.modId === mod.id).length,
        collections: new Set(
          creatorCollectionItems
            .filter((item) => item.modId === mod.id)
            .map((item) => item.collectionId),
        ).size,
        reviews: modReviews.length,
        comments: comments.filter((item) => item.modId === mod.id).length,
        averageRating: average(modReviews.map((item) => item.rating)),
      };
    })
    .sort((a, b) => b.downloads - a.downloads)
    .slice(0, 8);

  const modTitleById = new Map(mods.map((mod) => [mod.id, mod.title]));
  const topVersions = versions
    .filter((item) => modIds.has(item.modId))
    .map((item) => ({
      id: item.id,
      modId: item.modId,
      modTitle: modTitleById.get(item.modId) ?? 'Mod',
      version: item.version,
      downloads: Math.max(0, Number(item.downloads ?? 0) || 0),
      publishedAt: item.publishedAt ?? item.createdAt ?? '',
    }))
    .sort((a, b) => b.downloads - a.downloads)
    .slice(0, 6);

  return {
    creatorName:
      creator.profile?.displayName?.trim() || creator.name?.trim() || 'Creator',
    generatedAt: new Date().toISOString(),
    totals: {
      mods: mods.length,
      downloads: sum(mods.map((mod) => Math.max(0, Number(mod.downloads ?? 0) || 0))),
      views: sum(mods.map(modViews)),
      favorites: creatorFavorites.length,
      collections: new Set(creatorCollectionItems.map((item) => item.collectionId)).size,
      followers: creatorFollowers.length,
      reviews: creatorReviews.length,
      comments: comments.length,
      averageRating: average(creatorReviews.map((item) => item.rating)),
    },
    snapshots: snapshots
      .filter((item) => item.creatorId === creator.id)
      .map((item) => ({ ...item, totalCollections: item.totalCollections ?? 0 }))
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-366),
    topMods,
    topVersions,
  };
}

export async function recordCreatorAnalyticsSnapshot(
  creator: User,
  overview: CreatorAnalyticsOverview,
): Promise<CreatorAnalyticsOverview> {
  const allSnapshots = await readJsonSafe<CreatorAnalyticsSnapshot[]>(
    'creator-analytics.json',
    [],
  );
  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const existingIndex = allSnapshots.findIndex(
    (item) => item.creatorId === creator.id && item.date === today,
  );

  const snapshot: CreatorAnalyticsSnapshot = {
    id:
      existingIndex >= 0
        ? allSnapshots[existingIndex].id
        : `${creator.id}:${today}`,
    creatorId: creator.id,
    date: today,
    totalDownloads: overview.totals.downloads,
    totalViews: overview.totals.views,
    totalFavorites: overview.totals.favorites,
    totalCollections: overview.totals.collections,
    totalComments: overview.totals.comments,
    totalReviews: overview.totals.reviews,
    totalFollowers: overview.totals.followers,
    createdAt:
      existingIndex >= 0
        ? allSnapshots[existingIndex].createdAt
        : now.toISOString(),
    updatedAt: now.toISOString(),
  };

  if (existingIndex >= 0) allSnapshots[existingIndex] = snapshot;
  else allSnapshots.push(snapshot);

  allSnapshots.sort((a, b) => {
    const creatorCompare = a.creatorId.localeCompare(b.creatorId);
    return creatorCompare || a.date.localeCompare(b.date);
  });
  await writeJsonAtomic('creator-analytics.json', allSnapshots);

  return {
    ...overview,
    snapshots: allSnapshots
      .filter((item) => item.creatorId === creator.id)
      .map((item) => ({ ...item, totalCollections: item.totalCollections ?? 0 }))
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-366),
  };
}
