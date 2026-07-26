import 'server-only';

import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { dataDir } from './data-paths';
import { readJson, writeJson } from './json-store';
import type {
  AchievementAnnouncement,
  AchievementAnnouncementSnapshot,
  AchievementAnnouncementType,
} from './achievement-announcements';

export const achievementAnnouncementsPath = path.join(
  dataDir,
  'achievement-announcements.json',
);

let mutationQueue: Promise<void> = Promise.resolve();

function withMutationLock<T>(operation: () => Promise<T>): Promise<T> {
  const previous = mutationQueue;
  let release!: () => void;
  mutationQueue = new Promise<void>((resolve) => {
    release = resolve;
  });

  return previous.then(async () => {
    try {
      return await operation();
    } finally {
      release();
    }
  });
}

export async function getAchievementAnnouncements(): Promise<
  AchievementAnnouncement[]
> {
  return readJson<AchievementAnnouncement[]>(
    achievementAnnouncementsPath,
    [],
  );
}

export async function createAchievementAnnouncement(input: {
  userId: string;
  type: AchievementAnnouncementType;
  uniqueKey: string;
  previous?: AchievementAnnouncementSnapshot;
  current: AchievementAnnouncementSnapshot;
  metadata?: AchievementAnnouncement['metadata'];
}): Promise<{ created: boolean; announcement: AchievementAnnouncement }> {
  return withMutationLock(async () => {
    const announcements = await getAchievementAnnouncements();
    const existing = announcements.find(
      (item) =>
        item.userId === input.userId &&
        item.uniqueKey === input.uniqueKey,
    );

    if (existing) {
      return { created: false, announcement: existing };
    }

    const announcement: AchievementAnnouncement = {
      id: randomUUID(),
      userId: input.userId,
      type: input.type,
      uniqueKey: input.uniqueKey,
      createdAt: new Date().toISOString(),
      previous: input.previous,
      current: input.current,
      metadata: input.metadata,
    };

    announcements.push(announcement);
    await writeJson(achievementAnnouncementsPath, announcements);
    return { created: true, announcement };
  });
}

export async function getPendingAchievementAnnouncements(
  userId: string,
  limit = 12,
): Promise<AchievementAnnouncement[]> {
  const announcements = await getAchievementAnnouncements();
  return announcements
    .filter((item) => item.userId === userId && !item.seenAt)
    .sort((left, right) => left.createdAt.localeCompare(right.createdAt))
    .slice(0, Math.max(1, Math.min(50, limit)));
}

export async function markAchievementAnnouncementSeen(
  userId: string,
  announcementId: string,
): Promise<boolean> {
  return withMutationLock(async () => {
    const announcements = await getAchievementAnnouncements();
    const index = announcements.findIndex(
      (item) => item.id === announcementId && item.userId === userId,
    );

    if (index < 0) return false;
    if (announcements[index].seenAt) return true;

    announcements[index] = {
      ...announcements[index],
      seenAt: new Date().toISOString(),
    };
    await writeJson(achievementAnnouncementsPath, announcements);
    return true;
  });
}
