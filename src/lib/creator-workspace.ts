import fs from 'node:fs/promises';
import path from 'node:path';

import type { AccessLevel, User } from '@/lib/types';
import { getModsByAuthorId } from '@/lib/mods';

interface ReviewRecord {
  id: string;
  modId: string;
  rating: number;
}

interface CommentRecord {
  id: string;
  modId: string;
  moderationStatus?: 'VISIBLE' | 'HIDDEN' | 'DELETED';
}

interface FavoriteRecord {
  userId: string;
  modId: string;
}

interface CollectionItemRecord {
  collectionId: string;
  modId: string;
}

interface ModVersionRecord {
  id: string;
  modId: string;
  version: string;
  downloads?: number;
  createdAt?: string;
  publishedAt?: string;
  status?: string;
}

export interface CreatorWorkspaceMod {
  id: string;
  title: string;
  slug: string;
  game: string;
  category: string;
  version: string;
  gameVersion: string;
  accessLevel: AccessLevel;
  coverUrl: string;
  downloads: number;
  averageRating: number;
  reviewCount: number;
  commentCount: number;
  favoriteCount: number;
  collectionCount: number;
  releaseCount: number;
  updatedAt: string;
  createdAt: string;
}

export interface CreatorWorkspaceData {
  creatorName: string;
  mods: CreatorWorkspaceMod[];
  filters: {
    games: string[];
    categories: string[];
  };
  summary: {
    totalMods: number;
    totalDownloads: number;
    totalReviews: number;
    totalComments: number;
  };
}

const dataPath = (...parts: string[]) => path.join(process.cwd(), 'data', ...parts);

async function readJsonSafe<T>(fileName: string, fallback: T): Promise<T> {
  try {
    const raw = await fs.readFile(dataPath(fileName), 'utf8');
    return raw.trim() ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}


function cleanDisplayText(value: string | undefined | null): string {
  if (!value) return '';

  return value
    // Game-style BBCode: [B], [/B], [C], [FF0000], [#FF0000], [FFFFFF33]...
    .replace(/\[(?:\/?[a-z][a-z0-9_-]*|#?[0-9a-f]{6,8})\]/gi, '')
    // Remove any remaining empty formatting brackets without touching normal text.
    .replace(/\[\s*\]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export async function getCreatorWorkspaceData(
  creator: User,
): Promise<CreatorWorkspaceData> {
  const mods = await getModsByAuthorId(creator.id);
  const modIds = new Set(mods.map((mod) => mod.id));

  const [reviews, comments, favorites, collectionItems, versions] = await Promise.all([
    readJsonSafe<ReviewRecord[]>('reviews.json', []),
    readJsonSafe<CommentRecord[]>('comments.json', []),
    readJsonSafe<FavoriteRecord[]>('mod-favorites.json', []),
    readJsonSafe<CollectionItemRecord[]>('collection-items.json', []),
    readJsonSafe<ModVersionRecord[]>('mod-versions.json', []),
  ]);

  const visibleComments = comments.filter(
    (comment) =>
      modIds.has(comment.modId) &&
      comment.moderationStatus !== 'HIDDEN' &&
      comment.moderationStatus !== 'DELETED',
  );

  const workspaceMods = mods.map((mod) => {
    const modReviews = reviews.filter((item) => item.modId === mod.id);
    const modVersions = versions.filter((item) => item.modId === mod.id);

    return {
      id: mod.id,
      title: cleanDisplayText(mod.title) || mod.title,
      slug: mod.slug,
      game: mod.game,
      category: mod.category,
      version: mod.version,
      gameVersion: mod.gameVersion,
      accessLevel: mod.accessLevel,
      coverUrl: mod.coverUrl,
      downloads: mod.downloads,
      averageRating: average(modReviews.map((item) => item.rating)),
      reviewCount: modReviews.length,
      commentCount: visibleComments.filter((item) => item.modId === mod.id).length,
      favoriteCount: favorites.filter((item) => item.modId === mod.id).length,
      collectionCount: new Set(
        collectionItems
          .filter((item) => item.modId === mod.id)
          .map((item) => item.collectionId),
      ).size,
      releaseCount: Math.max(1, modVersions.length),
      updatedAt: mod.updatedAt,
      createdAt: mod.createdAt,
    } satisfies CreatorWorkspaceMod;
  });

  return {
    creatorName:
      cleanDisplayText(creator.profile?.displayName) ||
      cleanDisplayText(creator.name) ||
      'Creator',
    mods: workspaceMods,
    filters: {
      games: [...new Set(workspaceMods.map((mod) => mod.game))].sort((a, b) =>
        a.localeCompare(b, 'vi'),
      ),
      categories: [...new Set(workspaceMods.map((mod) => mod.category))].sort((a, b) =>
        a.localeCompare(b, 'vi'),
      ),
    },
    summary: {
      totalMods: workspaceMods.length,
      totalDownloads: workspaceMods.reduce((sum, mod) => sum + mod.downloads, 0),
      totalReviews: workspaceMods.reduce((sum, mod) => sum + mod.reviewCount, 0),
      totalComments: workspaceMods.reduce((sum, mod) => sum + mod.commentCount, 0),
    },
  };
}
