import fs from 'node:fs/promises';
import path from 'node:path';

import type { User } from '@/lib/types';
import { getModsByAuthorId } from '@/lib/mods';

interface CommentRecord {
  id: string;
  modId: string;
  userId: string;
  userName: string;
  content: string;
  moderationStatus?: 'VISIBLE' | 'HIDDEN' | 'DELETED';
  createdAt: string;
}

interface ReviewRecord {
  id: string;
  modId: string;
  userId: string;
  userName: string;
  rating: number;
  content?: string;
  createdAt: string;
}

interface FollowRecord {
  id: string;
  followerId: string;
  followingId: string;
  createdAt: string;
}

interface CollectionItemRecord {
  collectionId: string;
  modId: string;
  addedByUserId: string;
  createdAt: string;
}

interface NotificationRecord {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  href: string;
  isRead: boolean;
  createdAt: string;
}

interface AnalyticsSnapshot {
  id: string;
  creatorId: string;
  date: string;
  totalDownloads: number;
  totalViews: number;
  totalFavorites: number;
  totalComments: number;
  totalReviews: number;
  totalFollowers: number;
  createdAt: string;
}

export interface CreatorActivity {
  id: string;
  type: 'REVIEW' | 'COMMENT' | 'FOLLOW' | 'NOTIFICATION';
  title: string;
  description: string;
  href: string;
  createdAt: string;
  rating?: number;
}

export interface CreatorDashboardData {
  stats: {
    mods: number;
    downloads: number;
    followers: number;
    collections: number;
    averageRating: number;
    reviews: number;
    comments: number;
    unreadNotifications: number;
  };
  topMods: Array<{
    id: string;
    title: string;
    slug: string;
    coverUrl: string;
    version: string;
    downloads: number;
    averageRating: number;
    reviewCount: number;
  }>;
  recentActivities: CreatorActivity[];
  snapshots: AnalyticsSnapshot[];
}

const dataPath = (...parts: string[]) =>
  path.join(process.cwd(), 'data', ...parts);

async function readJsonSafe<T>(fileName: string, fallback: T): Promise<T> {
  try {
    const content = await fs.readFile(dataPath(fileName), 'utf8');
    return content.trim() ? (JSON.parse(content) as T) : fallback;
  } catch {
    return fallback;
  }
}

function getDisplayName(user: User | undefined, fallback: string): string {
  return user?.profile?.displayName?.trim() || user?.name?.trim() || fallback;
}

function visibleComments(comments: CommentRecord[]): CommentRecord[] {
  return comments.filter(
    (comment) =>
      comment.moderationStatus !== 'HIDDEN' &&
      comment.moderationStatus !== 'DELETED',
  );
}

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export async function getCreatorDashboardData(
  creator: User,
): Promise<CreatorDashboardData> {
  const mods = await getModsByAuthorId(creator.id);
  const modIds = new Set(mods.map((mod) => mod.id));

  const [commentsRaw, reviews, follows, collectionItems, notifications, users, snapshots] =
    await Promise.all([
      readJsonSafe<CommentRecord[]>('comments.json', []),
      readJsonSafe<ReviewRecord[]>('reviews.json', []),
      readJsonSafe<FollowRecord[]>('follows.json', []),
      readJsonSafe<CollectionItemRecord[]>('collection-items.json', []),
      readJsonSafe<NotificationRecord[]>('notifications.json', []),
      readJsonSafe<User[]>('users.json', []),
      readJsonSafe<AnalyticsSnapshot[]>('creator-analytics.json', []),
    ]);

  const comments = visibleComments(commentsRaw).filter((item) => modIds.has(item.modId));
  const creatorReviews = reviews.filter((item) => modIds.has(item.modId));
  const creatorFollowers = follows.filter((item) => item.followingId === creator.id);
  const creatorCollectionItems = collectionItems.filter((item) => modIds.has(item.modId));
  const creatorNotifications = notifications.filter((item) => item.userId === creator.id);
  const usersById = new Map(users.map((user) => [user.id, user]));

  const reviewGroups = new Map<string, ReviewRecord[]>();
  for (const review of creatorReviews) {
    const group = reviewGroups.get(review.modId) ?? [];
    group.push(review);
    reviewGroups.set(review.modId, group);
  }

  const topMods = [...mods]
    .sort((a, b) => b.downloads - a.downloads)
    .slice(0, 5)
    .map((mod) => {
      const modReviews = reviewGroups.get(mod.id) ?? [];
      return {
        id: mod.id,
        title: mod.title,
        slug: mod.slug,
        coverUrl: mod.coverUrl,
        version: mod.version,
        downloads: mod.downloads,
        averageRating: average(modReviews.map((item) => item.rating)),
        reviewCount: modReviews.length,
      };
    });

  const reviewActivities: CreatorActivity[] = creatorReviews.map((review) => ({
    id: `review:${review.id}`,
    type: 'REVIEW',
    title: `${review.userName} đã luận đạo mod`,
    description: review.content?.trim() || `Luận đạo ${review.rating}/5 sao`,
    href: `/mods/${mods.find((mod) => mod.id === review.modId)?.slug ?? ''}`,
    createdAt: review.createdAt,
    rating: review.rating,
  }));

  const commentActivities: CreatorActivity[] = comments.map((comment) => ({
    id: `comment:${comment.id}`,
    type: 'COMMENT',
    title: `${comment.userName} đã luận bàn`,
    description: comment.content,
    href: `/mods/${mods.find((mod) => mod.id === comment.modId)?.slug ?? ''}#comments`,
    createdAt: comment.createdAt,
  }));

  const followActivities: CreatorActivity[] = creatorFollowers.map((follow) => ({
    id: `follow:${follow.id}`,
    type: 'FOLLOW',
    title: `${getDisplayName(usersById.get(follow.followerId), 'Một thành viên')} đã kết giao với đạo hữu`,
    description: 'Follower mới của Creator Studio',
    href: creator.profileSlug ? `/authors/${creator.profileSlug}` : '/profile',
    createdAt: follow.createdAt,
  }));

  const notificationActivities: CreatorActivity[] = creatorNotifications.map((notification) => ({
    id: `notification:${notification.id}`,
    type: 'NOTIFICATION',
    title: notification.title,
    description: notification.message,
    href: notification.href || '/notifications',
    createdAt: notification.createdAt,
  }));

  const recentActivities = [
    ...reviewActivities,
    ...commentActivities,
    ...followActivities,
    ...notificationActivities,
  ]
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )
    .slice(0, 10);

  return {
    stats: {
      mods: mods.length,
      downloads: mods.reduce((sum, mod) => sum + mod.downloads, 0),
      followers: creatorFollowers.length,
      collections: new Set(creatorCollectionItems.map((item) => item.collectionId)).size,
      averageRating: average(creatorReviews.map((item) => item.rating)),
      reviews: creatorReviews.length,
      comments: comments.length,
      unreadNotifications: creatorNotifications.filter((item) => !item.isRead).length,
    },
    topMods,
    recentActivities,
    snapshots: snapshots
      .filter((item) => item.creatorId === creator.id)
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-30),
  };
}

export async function writeCreatorAnalyticsSnapshot(
  creator: User,
  data: CreatorDashboardData,
): Promise<void> {
  const snapshots = await readJsonSafe<AnalyticsSnapshot[]>('creator-analytics.json', []);
  const today = new Date().toISOString().slice(0, 10);
  const currentIndex = snapshots.findIndex(
    (item) => item.creatorId === creator.id && item.date === today,
  );

  const snapshot: AnalyticsSnapshot = {
    id: currentIndex >= 0 ? snapshots[currentIndex].id : `${creator.id}:${today}`,
    creatorId: creator.id,
    date: today,
    totalDownloads: data.stats.downloads,
    totalViews: 0,
    totalFavorites: 0,
    totalComments: data.stats.comments,
    totalReviews: data.stats.reviews,
    totalFollowers: data.stats.followers,
    createdAt: new Date().toISOString(),
  };

  if (currentIndex >= 0) snapshots[currentIndex] = snapshot;
  else snapshots.push(snapshot);

  await fs.mkdir(dataPath(), { recursive: true });
  await fs.writeFile(
    dataPath('creator-analytics.json'),
    JSON.stringify(snapshots, null, 2),
    'utf8',
  );
}
