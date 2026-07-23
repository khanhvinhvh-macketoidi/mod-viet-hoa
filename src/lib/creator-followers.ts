import fs from 'node:fs/promises';
import path from 'node:path';

import type { User } from '@/lib/types';

interface FollowRecord {
  id: string;
  followerId: string;
  followingId: string;
  createdAt: string;
}

interface ReviewRecord {
  id: string;
  modId: string;
  userId: string;
  rating: number;
  createdAt: string;
}

interface CommentRecord {
  id: string;
  modId: string;
  userId: string;
  moderationStatus?: 'VISIBLE' | 'HIDDEN' | 'DELETED';
  createdAt: string;
}

interface FavoriteRecord {
  id?: string;
  userId: string;
  modId: string;
  createdAt: string;
}

interface CollectionRecord {
  id: string;
  ownerId: string;
  userId?: string;
  createdAt: string;
}

interface CollectionItemRecord {
  collectionId: string;
  modId: string;
  addedByUserId: string;
  createdAt: string;
}

interface ModRecord {
  id: string;
  authorId?: string;
}

export interface CreatorFollowerItem {
  id: string;
  name: string;
  profileSlug?: string;
  avatar?: string;
  role: string;
  isVip: boolean;
  joinedAt: string;
  followedAt: string;
  lastActiveAt: string;
  reviewCount: number;
  commentCount: number;
  favoriteCount: number;
  collectionCount: number;
  creatorModFavoriteCount: number;
  creatorModReviewCount: number;
  creatorModCommentCount: number;
}

export interface CreatorFollowersData {
  stats: {
    followers: number;
    following: number;
    newToday: number;
    newThisWeek: number;
    activeLast30Days: number;
    activeRate: number;
  };
  followers: CreatorFollowerItem[];
}

const dataPath = (fileName: string) =>
  path.join(process.cwd(), 'data', fileName);

async function readJsonSafe<T>(fileName: string, fallback: T): Promise<T> {
  try {
    const content = await fs.readFile(dataPath(fileName), 'utf8');
    return content.trim() ? (JSON.parse(content) as T) : fallback;
  } catch {
    return fallback;
  }
}

function cleanDisplayName(value: string | undefined, fallback: string): string {
  const source = value?.trim() || fallback;
  return source
    .replace(/\[(?:b|i|u|s|c|center|left|right)\]/gi, '')
    .replace(/\[\/?(?:b|i|u|s|c|center|left|right)\]/gi, '')
    .replace(/\[(?:#?[0-9a-f]{6}|[0-9a-f]{8})\]/gi, '')
    .replace(/\[color(?:=[^\]]+)?\]/gi, '')
    .replace(/\[\/color\]/gi, '')
    .replace(/\s+/g, ' ')
    .trim() || fallback;
}

function newestDate(values: Array<string | undefined>, fallback: string): string {
  let newest = new Date(fallback).getTime();
  for (const value of values) {
    if (!value) continue;
    const time = new Date(value).getTime();
    if (Number.isFinite(time) && time > newest) newest = time;
  }
  return new Date(newest).toISOString();
}

function isVisibleComment(comment: CommentRecord): boolean {
  return comment.moderationStatus !== 'HIDDEN' && comment.moderationStatus !== 'DELETED';
}

export async function getCreatorFollowersData(
  creator: User,
): Promise<CreatorFollowersData> {
  const [users, follows, reviews, commentsRaw, favorites, collections, collectionItems, mods] =
    await Promise.all([
      readJsonSafe<User[]>('users.json', []),
      readJsonSafe<FollowRecord[]>('follows.json', []),
      readJsonSafe<ReviewRecord[]>('reviews.json', []),
      readJsonSafe<CommentRecord[]>('comments.json', []),
      readJsonSafe<FavoriteRecord[]>('mod-favorites.json', []),
      readJsonSafe<CollectionRecord[]>('collections.json', []),
      readJsonSafe<CollectionItemRecord[]>('collection-items.json', []),
      readJsonSafe<ModRecord[]>('mods.json', []),
    ]);

  const comments = commentsRaw.filter(isVisibleComment);
  const usersById = new Map(users.map((user) => [user.id, user]));
  const creatorModIds = new Set(
    mods.filter((mod) => mod.authorId === creator.id).map((mod) => mod.id),
  );

  const followerRelations = follows
    .filter((follow) => follow.followingId === creator.id)
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );

  const uniqueRelations = new Map<string, FollowRecord>();
  for (const relation of followerRelations) {
    if (!uniqueRelations.has(relation.followerId)) {
      uniqueRelations.set(relation.followerId, relation);
    }
  }

  const followers: CreatorFollowerItem[] = [];

  for (const relation of uniqueRelations.values()) {
    const user = usersById.get(relation.followerId);
    if (!user || user.isActive === false) continue;

    const userReviews = reviews.filter((item) => item.userId === user.id);
    const userComments = comments.filter((item) => item.userId === user.id);
    const userFavorites = favorites.filter((item) => item.userId === user.id);
    const userCollections = collections.filter(
      (item) => item.ownerId === user.id || item.userId === user.id,
    );
    const userCollectionIds = new Set(userCollections.map((item) => item.id));
    const userCollectionItems = collectionItems.filter(
      (item) =>
        item.addedByUserId === user.id || userCollectionIds.has(item.collectionId),
    );

    const activityDates = [
      relation.createdAt,
      user.updatedAt,
      ...userReviews.map((item) => item.createdAt),
      ...userComments.map((item) => item.createdAt),
      ...userFavorites.map((item) => item.createdAt),
      ...userCollections.map((item) => item.createdAt),
      ...userCollectionItems.map((item) => item.createdAt),
    ];

    followers.push({
      id: user.id,
      name: cleanDisplayName(
        user.profile?.displayName || user.name,
        'Thành viên',
      ),
      profileSlug: user.profileSlug,
      avatar: user.profile?.avatar,
      role: user.role,
      isVip: Boolean(user.isVip),
      joinedAt: user.createdAt,
      followedAt: relation.createdAt,
      lastActiveAt: newestDate(activityDates, relation.createdAt),
      reviewCount: userReviews.length,
      commentCount: userComments.length,
      favoriteCount: userFavorites.length,
      collectionCount: userCollections.length,
      creatorModFavoriteCount: userFavorites.filter((item) =>
        creatorModIds.has(item.modId),
      ).length,
      creatorModReviewCount: userReviews.filter((item) =>
        creatorModIds.has(item.modId),
      ).length,
      creatorModCommentCount: userComments.filter((item) =>
        creatorModIds.has(item.modId),
      ).length,
    });
  }

  followers.sort(
    (a, b) =>
      new Date(b.followedAt).getTime() - new Date(a.followedAt).getTime(),
  );

  const now = Date.now();
  const oneDay = 24 * 60 * 60 * 1000;
  const startToday = new Date();
  startToday.setHours(0, 0, 0, 0);
  const startWeek = now - 7 * oneDay;
  const start30Days = now - 30 * oneDay;
  const activeLast30Days = followers.filter(
    (item) => new Date(item.lastActiveAt).getTime() >= start30Days,
  ).length;

  return {
    stats: {
      followers: followers.length,
      following: new Set(
        follows
          .filter((follow) => follow.followerId === creator.id)
          .map((follow) => follow.followingId),
      ).size,
      newToday: followers.filter(
        (item) => new Date(item.followedAt).getTime() >= startToday.getTime(),
      ).length,
      newThisWeek: followers.filter(
        (item) => new Date(item.followedAt).getTime() >= startWeek,
      ).length,
      activeLast30Days,
      activeRate:
        followers.length > 0
          ? Math.round((activeLast30Days / followers.length) * 100)
          : 0,
    },
    followers,
  };
}
