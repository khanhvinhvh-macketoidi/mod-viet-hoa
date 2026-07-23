import fs from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { getFollowerIds } from './follows';
import { getUserById } from './users';
import type { ModItem } from './types';

export type NotificationType =
  | 'FOLLOW'
  | 'MOD_PUBLISHED'
  | 'MOD_UPDATED'
  | 'COLLECTION_UPDATED'
  | 'COLLECTION_MOD_ADDED'
  | 'SYSTEM';

export interface NotificationItem {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  href: string;
  actorUserId?: string;
  relatedModId?: string;
  dedupeKey?: string;
  isRead: boolean;
  createdAt: string;
  readAt?: string;
}

const notificationsPath = path.join(
  process.cwd(),
  'data',
  'notifications.json',
);

async function ensureNotificationsFile(): Promise<void> {
  await fs.mkdir(path.dirname(notificationsPath), {
    recursive: true,
  });

  try {
    await fs.access(notificationsPath);
  } catch {
    await fs.writeFile(
      notificationsPath,
      JSON.stringify([], null, 2),
      'utf8',
    );
  }
}

export async function getNotifications(): Promise<
  NotificationItem[]
> {
  await ensureNotificationsFile();

  const content = await fs.readFile(
    notificationsPath,
    'utf8',
  );

  if (!content.trim()) {
    return [];
  }

  return JSON.parse(content) as NotificationItem[];
}

export async function saveNotifications(
  notifications: NotificationItem[],
): Promise<void> {
  await fs.mkdir(path.dirname(notificationsPath), {
    recursive: true,
  });

  await fs.writeFile(
    notificationsPath,
    JSON.stringify(notifications, null, 2),
    'utf8',
  );
}

export async function createNotification(input: {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  href: string;
  actorUserId?: string;
  relatedModId?: string;
  dedupeKey?: string;
}): Promise<NotificationItem> {
  const notifications = await getNotifications();

  if (input.dedupeKey) {
    const existing = notifications.find(
      (item) =>
        item.userId === input.userId &&
        item.dedupeKey === input.dedupeKey,
    );

    if (existing) {
      return existing;
    }
  }

  const notification: NotificationItem = {
    id: randomUUID(),
    userId: input.userId,
    type: input.type,
    title: input.title,
    message: input.message,
    href: input.href,
    actorUserId: input.actorUserId,
    relatedModId: input.relatedModId,
    dedupeKey: input.dedupeKey,
    isRead: false,
    createdAt: new Date().toISOString(),
  };

  notifications.push(notification);
  await saveNotifications(notifications);

  return notification;
}

export async function getNotificationsByUserId(
  userId: string,
): Promise<NotificationItem[]> {
  const notifications = await getNotifications();

  return notifications
    .filter((item) => item.userId === userId)
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() -
        new Date(a.createdAt).getTime(),
    );
}

export async function getUnreadNotificationCount(
  userId: string,
): Promise<number> {
  const notifications =
    await getNotificationsByUserId(userId);

  return notifications.filter((item) => !item.isRead)
    .length;
}

export async function markNotificationRead(
  notificationId: string,
  userId: string,
): Promise<NotificationItem | null> {
  const notifications = await getNotifications();
  const index = notifications.findIndex(
    (item) =>
      item.id === notificationId &&
      item.userId === userId,
  );

  if (index < 0) {
    return null;
  }

  if (!notifications[index].isRead) {
    notifications[index] = {
      ...notifications[index],
      isRead: true,
      readAt: new Date().toISOString(),
    };

    await saveNotifications(notifications);
  }

  return notifications[index];
}

export async function markAllNotificationsRead(
  userId: string,
): Promise<number> {
  const notifications = await getNotifications();
  const now = new Date().toISOString();
  let updated = 0;

  const next = notifications.map((item) => {
    if (item.userId !== userId || item.isRead) {
      return item;
    }

    updated += 1;

    return {
      ...item,
      isRead: true,
      readAt: now,
    };
  });

  if (updated > 0) {
    await saveNotifications(next);
  }

  return updated;
}

export async function deleteNotification(
  notificationId: string,
  userId: string,
): Promise<boolean> {
  const notifications = await getNotifications();

  const next = notifications.filter(
    (item) =>
      !(
        item.id === notificationId &&
        item.userId === userId
      ),
  );

  if (next.length === notifications.length) {
    return false;
  }

  await saveNotifications(next);
  return true;
}

export async function createFollowNotification(
  followerId: string,
  followingId: string,
): Promise<NotificationItem | null> {
  if (followerId === followingId) {
    return null;
  }

  const follower = await getUserById(followerId);

  if (!follower || follower.isActive === false) {
    return null;
  }

  const displayName =
    follower.profile?.displayName || follower.name;

  return createNotification({
    userId: followingId,
    type: 'FOLLOW',
    title: 'Đạo hữu có đồng đạo mới',
    message: `${displayName} đã kết giao với đạo hữu.`,
    href: `/authors/${follower.profileSlug ?? ''}`,
    actorUserId: followerId,
    dedupeKey: `follow:${followerId}:${followingId}`,
  });
}

export async function removeFollowNotification(
  followerId: string,
  followingId: string,
): Promise<void> {
  const notifications = await getNotifications();
  const dedupeKey = `follow:${followerId}:${followingId}`;

  const next = notifications.filter(
    (item) =>
      !(
        item.userId === followingId &&
        item.dedupeKey === dedupeKey
      ),
  );

  if (next.length !== notifications.length) {
    await saveNotifications(next);
  }
}

export async function createModPublishedNotifications(
  authorId: string,
  mod: Pick<ModItem, 'id' | 'title' | 'slug'>,
): Promise<number> {
  const [author, followerIds] = await Promise.all([
    getUserById(authorId),
    getFollowerIds(authorId),
  ]);

  if (!author || author.isActive === false) {
    return 0;
  }

  const authorName =
    author.profile?.displayName || author.name;

  let created = 0;

  for (const followerId of followerIds) {
    if (followerId === authorId) {
      continue;
    }

    await createNotification({
      userId: followerId,
      type: 'MOD_PUBLISHED',
      title: `${authorName} vừa đăng mod mới`,
      message: mod.title,
      href: `/mods/${mod.slug}`,
      actorUserId: authorId,
      relatedModId: mod.id,
      dedupeKey: `mod-published:${mod.id}:${followerId}`,
    });

    created += 1;
  }

  return created;
}


export async function createCollectionModAddedNotifications(
  collection: {
    id: string;
    title: string;
    slug: string;
    ownerId: string;
    visibility: 'PUBLIC' | 'PRIVATE';
    updatedAt?: string;
  },
  mod: Pick<ModItem, 'id' | 'title'>,
  followerIds: string[],
): Promise<number> {
  if (collection.visibility !== 'PUBLIC') {
    return 0;
  }

  let created = 0;

  for (const followerId of followerIds) {
    if (followerId === collection.ownerId) {
      continue;
    }

    await createNotification({
      userId: followerId,
      type: 'COLLECTION_MOD_ADDED',
      title: `Collection “${collection.title}” có mod mới`,
      message: mod.title,
      href: `/collections/${collection.slug}`,
      actorUserId: collection.ownerId,
      relatedModId: mod.id,
      dedupeKey:
        `collection-mod:${collection.id}:${mod.id}:${followerId}`,
    });

    created += 1;
  }

  return created;
}

export async function createCollectionUpdatedNotifications(
  collection: {
    id: string;
    title: string;
    slug: string;
    ownerId: string;
    visibility: 'PUBLIC' | 'PRIVATE';
    updatedAt?: string;
  },
  followerIds: string[],
): Promise<number> {
  if (collection.visibility !== 'PUBLIC') {
    return 0;
  }

  let created = 0;

  for (const followerId of followerIds) {
    if (followerId === collection.ownerId) {
      continue;
    }

    await createNotification({
      userId: followerId,
      type: 'COLLECTION_UPDATED',
      title: `Collection “${collection.title}” vừa được cập nhật`,
      message:
        'Tên, mô tả hoặc quyền hiển thị của collection đã thay đổi.',
      href: `/collections/${collection.slug}`,
      actorUserId: collection.ownerId,
      dedupeKey:
        `collection-updated:${collection.id}:${collection.updatedAt ?? ''}:${followerId}`,
    });

    created += 1;
  }

  return created;
}

// M15.1.6 — Compatibility helpers for comment/review notification routes.
// The flexible argument parsing keeps older route call signatures working.
type NotificationCompatRecord = Record<string, unknown>;

function isCompatRecord(value: unknown): value is NotificationCompatRecord {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function asCompatRecord(value: unknown): NotificationCompatRecord {
  return isCompatRecord(value) ? value : {};
}

function getCompatString(value: unknown): string | undefined {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed || undefined;
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value);
  }

  return undefined;
}

function getNotificationCompatObject(
  args: unknown[],
): NotificationCompatRecord {
  return asCompatRecord(args.find(isCompatRecord));
}

export async function createCommentNotifications(
  ...args: unknown[]
): Promise<number> {
  const input = getNotificationCompatObject(args);
  const mod = asCompatRecord(input.mod ?? input.relatedMod);
  const comment = asCompatRecord(input.comment ?? input.item);
  const actor = asCompatRecord(input.user ?? input.actor ?? input.commentUser);
  const actorProfile = asCompatRecord(actor.profile);

  const ownerId = getCompatString(
    input.ownerId ??
      input.authorId ??
      input.modAuthorId ??
      mod.authorId,
  );

  const actorId = getCompatString(
    input.actorUserId ??
      input.userId ??
      comment.userId ??
      actor.id,
  );

  if (!ownerId || ownerId === actorId) {
    return 0;
  }

  const actorName =
    getCompatString(input.actorName) ??
    getCompatString(actorProfile.displayName) ??
    getCompatString(actor.name) ??
    getCompatString(comment.userName) ??
    'Một thành viên';

  const modTitle =
    getCompatString(mod.title) ??
    getCompatString(input.modTitle) ??
    'mod của đạo hữu';
  const modSlug =
    getCompatString(mod.slug) ?? getCompatString(input.modSlug);
  const modId =
    getCompatString(mod.id) ??
    getCompatString(input.modId) ??
    getCompatString(comment.modId);
  const commentId =
    getCompatString(comment.id) ??
    getCompatString(input.commentId) ??
    'new';

  await createNotification({
    userId: ownerId,
    type: 'SYSTEM',
    title: 'Mod của đạo hữu có luận bàn mới',
    message: `${actorName} đã luận bàn tại ${modTitle}.`,
    href: modSlug ? `/mods/${modSlug}#comments` : '/creator/notifications',
    actorUserId: actorId,
    relatedModId: modId,
    dedupeKey: `comment:${commentId}:${ownerId}`,
  });

  return 1;
}

export async function createReviewNotification(
  ...args: unknown[]
): Promise<NotificationItem | null> {
  const input = getNotificationCompatObject(args);
  const mod = asCompatRecord(input.mod ?? input.relatedMod);
  const review = asCompatRecord(input.review ?? input.item);
  const actor = asCompatRecord(input.user ?? input.actor ?? input.reviewUser);
  const actorProfile = asCompatRecord(actor.profile);

  const ownerId = getCompatString(
    input.ownerId ??
      input.authorId ??
      input.modAuthorId ??
      mod.authorId,
  );

  const actorId = getCompatString(
    input.actorUserId ??
      input.userId ??
      review.userId ??
      actor.id,
  );

  if (!ownerId || ownerId === actorId) {
    return null;
  }

  const actorName =
    getCompatString(input.actorName) ??
    getCompatString(actorProfile.displayName) ??
    getCompatString(actor.name) ??
    getCompatString(review.userName) ??
    'Một thành viên';

  const ratingValue = input.rating ?? review.rating ?? review.score ?? 0;
  const rating =
    typeof ratingValue === 'number' || typeof ratingValue === 'string'
      ? Number(ratingValue)
      : 0;

  const modTitle =
    getCompatString(mod.title) ??
    getCompatString(input.modTitle) ??
    'mod của đạo hữu';
  const modSlug =
    getCompatString(mod.slug) ?? getCompatString(input.modSlug);
  const modId =
    getCompatString(mod.id) ??
    getCompatString(input.modId) ??
    getCompatString(review.modId);
  const reviewId =
    getCompatString(review.id) ??
    getCompatString(input.reviewId) ??
    `${actorId ?? 'unknown'}:${modId ?? 'unknown'}`;
  const ratingText = Number.isFinite(rating) && rating > 0
    ? ` ${rating}★`
    : '';

  return createNotification({
    userId: ownerId,
    type: 'SYSTEM',
    title: 'Mod của đạo hữu có luận đạo mới',
    message: `${actorName} đã luận đạo${ratingText} cho ${modTitle}.`,
    href: modSlug ? `/mods/${modSlug}#reviews` : '/creator/notifications',
    actorUserId: actorId,
    relatedModId: modId,
    dedupeKey: `review:${reviewId}:${ownerId}`,
  });
}
