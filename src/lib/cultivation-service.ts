import 'server-only';

import { randomUUID } from 'node:crypto';
import { getUserById, getUsers, saveUsers } from './users';
import type { CultivationProgress, User } from './types';
import {
  grantCultivationLog,
  recordFirstModView,
  reverseCultivationLog,
  type CultivationLog,
  type CultivationLogType,
} from './cultivation-repository';
import { getCultivationSettings, getCultivationView } from './cultivation';

export const CULTIVATION_POINTS = {
  DAILY_LOGIN: 5,
  LOGIN_STREAK_BONUS: 5,
  COMMENT_CREATED: 50,
  REPLY_CREATED: 10,
  COMMENT_LIKED: 5,
  COMMENT_HELPFUL: 30,
  MOD_VIEWED: 5,
  MOD_LIKED: 20,
  REVIEW_WITHOUT_CONTENT: 50,
  REVIEW_WITH_CONTENT: 100,
  REVIEW_CONTENT_ADDED: 50,
  MOD_PUBLISHED: 200,
  AVATAR: 20,
  BIO: 20,
  REFERRAL: 200,
} as const;

function createLog(input: {
  userId: string;
  type: CultivationLogType;
  points: number;
  targetId?: string;
  uniqueKey?: string;
  metadata?: CultivationLog['metadata'];
}): CultivationLog {
  return {
    id: randomUUID(),
    createdAt: new Date().toISOString(),
    ...input,
  };
}

function dateKey(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function previousDateKey(date = new Date()): string {
  const previous = new Date(date);
  previous.setDate(previous.getDate() - 1);
  return dateKey(previous);
}

function updateProgressFromTotalXp(
  user: User,
  totalXp: number,
): User {
  return user;
}

async function applyDeltaToUser(userId: string, delta: number): Promise<void> {
  if (!delta) return;

  const users = await getUsers();
  const index = users.findIndex((user) => user.id === userId);
  if (index < 0) return;

  const settings = await getCultivationSettings();
  const current = users[index].cultivation;
  const currentTotal = Math.max(0, Number(current?.totalXp ?? current?.realmXp ?? 0));
  const nextTotal = Math.max(0, currentTotal + delta);

  const view = getCultivationView(
    { ...users[index], cultivation: { ...current, totalXp: nextTotal } as CultivationProgress },
    { publishedModCount: 0, totalDownloads: 0, totalReviews: 0, totalComments: 0, averageRating: 0 },
    settings,
  );

  users[index] = {
    ...users[index],
    cultivation: {
      realmId: view.realm.id,
      realmXp: view.realmXp,
      totalXp: nextTotal,
      breakthroughStatus: view.isRealmComplete ? 'READY' : 'CULTIVATING',
      completedQuestIds: current?.completedQuestIds ?? [],
      updatedAt: new Date().toISOString(),
      login: current?.login,
    },
    updatedAt: new Date().toISOString(),
  };

  await saveUsers(users);
}

export async function grantCultivation(input: {
  userId: string;
  type: CultivationLogType;
  points: number;
  targetId?: string;
  uniqueKey?: string;
  metadata?: CultivationLog['metadata'];
}): Promise<{ granted: boolean; points: number }> {
  if (input.points <= 0) return { granted: false, points: 0 };

  const log = createLog(input);
  const result = await grantCultivationLog(log);
  if (!result.granted) return { granted: false, points: 0 };

  await applyDeltaToUser(input.userId, input.points);
  return { granted: true, points: input.points };
}

export async function revokeCultivation(input: {
  userId: string;
  uniqueKey: string;
  type: CultivationLogType;
  points: number;
  targetId?: string;
  metadata?: CultivationLog['metadata'];
}): Promise<{ reversed: boolean; points: number }> {
  if (input.points <= 0) return { reversed: false, points: 0 };

  const log = createLog({
    userId: input.userId,
    type: input.type,
    points: -input.points,
    targetId: input.targetId,
    uniqueKey: `${input.uniqueKey}:REVERSAL:${randomUUID()}`,
    metadata: input.metadata,
  });

  const result = await reverseCultivationLog(
    input.userId,
    input.uniqueKey,
    log,
  );

  if (!result.reversed) return { reversed: false, points: 0 };

  await applyDeltaToUser(input.userId, -input.points);
  return { reversed: true, points: input.points };
}

export async function rewardDailyLogin(userId: string): Promise<void> {
  const user = await getUserById(userId);
  if (!user) return;

  const today = dateKey();
  const previous = previousDateKey();
  const login = user.cultivation?.login;

  if (login?.lastRewardDate === today) return;

  const streak = login?.lastRewardDate === previous
    ? Math.max(0, Number(login.streak ?? 0)) + 1
    : 1;

  const daily = await grantCultivation({
    userId,
    type: 'DAILY_LOGIN',
    points: CULTIVATION_POINTS.DAILY_LOGIN,
    uniqueKey: `DAILY_LOGIN:${userId}:${today}`,
  });

  if (streak % 3 === 0) {
    await grantCultivation({
      userId,
      type: 'LOGIN_STREAK_BONUS',
      points: CULTIVATION_POINTS.LOGIN_STREAK_BONUS,
      uniqueKey: `LOGIN_STREAK_BONUS:${userId}:${streak}`,
      metadata: { streak },
    });
  }

  const users = await getUsers();
  const index = users.findIndex((item) => item.id === userId);
  if (index < 0) return;

  users[index] = {
    ...users[index],
    cultivation: {
      ...(users[index].cultivation ?? {
        realmId: 'LUYEN_KHI',
        realmXp: 0,
        totalXp: 0,
        breakthroughStatus: 'CULTIVATING' as const,
        completedQuestIds: [],
        updatedAt: new Date().toISOString(),
      }),
      login: { lastRewardDate: today, streak },
      updatedAt: new Date().toISOString(),
    },
  };
  await saveUsers(users);

  void daily;
}

export async function rewardFirstModView(userId: string, modId: string): Promise<void> {
  const firstView = await recordFirstModView(userId, modId);
  if (!firstView) return;

  await grantCultivation({
    userId,
    type: 'MOD_VIEWED',
    points: CULTIVATION_POINTS.MOD_VIEWED,
    targetId: modId,
    uniqueKey: `MOD_VIEWED:${userId}:${modId}`,
  });
}

export async function rewardCommentCreated(input: {
  userId: string;
  commentId: string;
  isReply: boolean;
}): Promise<void> {
  await grantCultivation({
    userId: input.userId,
    type: input.isReply ? 'REPLY_CREATED' : 'COMMENT_CREATED',
    points: input.isReply
      ? CULTIVATION_POINTS.REPLY_CREATED
      : CULTIVATION_POINTS.COMMENT_CREATED,
    targetId: input.commentId,
    uniqueKey: `COMMENT_CREATED:${input.commentId}`,
  });
}

export async function rewardCommentLike(input: {
  ownerUserId: string;
  likerUserId: string;
  commentId: string;
  liked: boolean;
}): Promise<void> {
  if (input.ownerUserId === input.likerUserId) return;

  const uniqueKey = `COMMENT_LIKE:${input.commentId}:${input.likerUserId}`;

  if (input.liked) {
    await grantCultivation({
      userId: input.ownerUserId,
      type: 'COMMENT_LIKED',
      points: CULTIVATION_POINTS.COMMENT_LIKED,
      targetId: input.commentId,
      uniqueKey,
      metadata: { likerUserId: input.likerUserId },
    });
  } else {
    await revokeCultivation({
      userId: input.ownerUserId,
      type: 'COMMENT_UNLIKED',
      points: CULTIVATION_POINTS.COMMENT_LIKED,
      targetId: input.commentId,
      uniqueKey,
      metadata: { likerUserId: input.likerUserId },
    });
  }
}

export async function rewardReviewCreated(input: {
  userId: string;
  reviewId: string;
  hasContent: boolean;
}): Promise<void> {
  await grantCultivation({
    userId: input.userId,
    type: 'REVIEW_CREATED',
    points: CULTIVATION_POINTS.REVIEW_WITHOUT_CONTENT,
    targetId: input.reviewId,
    uniqueKey: `REVIEW_REWARD:${input.reviewId}`,
  });

  if (input.hasContent) {
    await grantCultivation({
      userId: input.userId,
      type: 'REVIEW_CONTENT_ADDED',
      points: CULTIVATION_POINTS.REVIEW_CONTENT_ADDED,
      targetId: input.reviewId,
      uniqueKey: `REVIEW_CONTENT:${input.reviewId}`,
    });
  }
}

export async function rewardReviewContentTransition(input: {
  userId: string;
  reviewId: string;
  hadContent: boolean;
  hasContent: boolean;
}): Promise<void> {
  if (input.hadContent === input.hasContent) return;

  const key = `REVIEW_CONTENT:${input.reviewId}`;

  if (input.hasContent) {
    await grantCultivation({
      userId: input.userId,
      type: 'REVIEW_CONTENT_ADDED',
      points: CULTIVATION_POINTS.REVIEW_CONTENT_ADDED,
      targetId: input.reviewId,
      uniqueKey: key,
    });
  } else {
    await revokeCultivation({
      userId: input.userId,
      uniqueKey: key,
      type: 'REVIEW_CONTENT_REMOVED',
      points: CULTIVATION_POINTS.REVIEW_CONTENT_ADDED,
      targetId: input.reviewId,
    });
  }
}

export async function rewardAvatarTransition(input: {
  userId: string;
  previousAvatar?: string;
  nextAvatar?: string;
}): Promise<void> {
  const hadAvatar = Boolean(input.previousAvatar && !input.previousAvatar.includes('default-avatar'));
  const hasAvatar = Boolean(input.nextAvatar && !input.nextAvatar.includes('default-avatar'));
  if (hadAvatar === hasAvatar) return;

  const key = `AVATAR_STATE:${input.userId}`;
  if (hasAvatar) {
    await grantCultivation({
      userId: input.userId,
      type: hadAvatar ? 'AVATAR_RESTORED' : 'AVATAR_ADDED',
      points: CULTIVATION_POINTS.AVATAR,
      uniqueKey: key,
    });
  } else {
    await revokeCultivation({
      userId: input.userId,
      uniqueKey: key,
      type: 'AVATAR_REMOVED',
      points: CULTIVATION_POINTS.AVATAR,
    });
  }
}

export async function rewardBioTransition(input: {
  userId: string;
  previousBio?: string;
  nextBio?: string;
}): Promise<void> {
  const hadBio = Boolean(input.previousBio?.trim());
  const hasBio = Boolean(input.nextBio?.trim());
  if (hadBio === hasBio) return;

  const key = `BIO_STATE:${input.userId}`;
  if (hasBio) {
    await grantCultivation({
      userId: input.userId,
      type: hadBio ? 'BIO_RESTORED' : 'BIO_ADDED',
      points: CULTIVATION_POINTS.BIO,
      uniqueKey: key,
    });
  } else {
    await revokeCultivation({
      userId: input.userId,
      uniqueKey: key,
      type: 'BIO_REMOVED',
      points: CULTIVATION_POINTS.BIO,
    });
  }
}
