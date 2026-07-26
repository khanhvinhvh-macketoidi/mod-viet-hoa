import 'server-only';

import { randomUUID } from 'node:crypto';
import { getUserById, getUsers, saveUsers } from './users';
import type { AuthorStats, CultivationProgress, User } from './types';
import {
  calculateCultivationXpFromLogs,
  getCultivationLogs,
  grantCultivationLog,
  reverseCultivationLog,
  type CultivationLog,
  type CultivationLogType,
} from './cultivation-repository';
import { getCultivationSettings, getCultivationView } from './cultivation';
import {
  announceCultivationDemotion,
  announceCultivationPromotion,
} from './achievement-announcement-service';

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

const EMPTY_AUTHOR_STATS: AuthorStats = {
  publishedModCount: 0,
  totalDownloads: 0,
  totalReviews: 0,
  totalComments: 0,
  averageRating: 0,
};

let cultivationMutationQueue: Promise<void> = Promise.resolve();

function withCultivationMutationLock<T>(
  operation: () => Promise<T>,
): Promise<T> {
  const previous = cultivationMutationQueue;
  let release!: () => void;

  cultivationMutationQueue = new Promise<void>((resolve) => {
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


async function announceCultivationRealmChangeIfNeeded(input: {
  userId: string;
  triggerId: string;
  previousUser: User;
  currentUser: User;
}): Promise<void> {
  const settings = await getCultivationSettings();
  const previousView = getCultivationView(
    input.previousUser,
    EMPTY_AUTHOR_STATS,
    settings,
  );
  const currentView = getCultivationView(
    input.currentUser,
    EMPTY_AUTHOR_STATS,
    settings,
  );
  const previousIndex = settings.realms.findIndex(
    (realm) => realm.id === previousView.realm.id,
  );
  const currentIndex = settings.realms.findIndex(
    (realm) => realm.id === currentView.realm.id,
  );

  if (
    previousIndex < 0 ||
    currentIndex < 0 ||
    currentIndex === previousIndex
  ) {
    return;
  }

  const payload = {
    userId: input.userId,
    triggerId: input.triggerId,
    previous: {
      realmId: previousView.realm.id,
      realmName: previousView.realm.name,
      phaseName: previousView.phaseName,
      className: previousView.realm.className,
    },
    current: {
      realmId: currentView.realm.id,
      realmName: currentView.realm.name,
      phaseName: currentView.phaseName,
      className: currentView.realm.className,
    },
  };

  if (currentIndex > previousIndex) {
    await announceCultivationPromotion(payload).catch((error) => {
      console.error('Không thể tạo popup phá cảnh:', error);
    });
    return;
  }

  await announceCultivationDemotion(payload).catch((error) => {
    console.error('Không thể tạo popup tụt cảnh giới:', error);
  });
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

function applyTotalXpToUser(
  user: User,
  totalXp: number,
  settings: Awaited<ReturnType<typeof getCultivationSettings>>,
): User {
  const current = user.cultivation;
  const safeTotalXp = Math.max(0, Math.round(totalXp));

  const view = getCultivationView(
    {
      ...user,
      cultivation: {
        ...(current ?? {}),
        totalXp: safeTotalXp,
      } as CultivationProgress,
    },
    EMPTY_AUTHOR_STATS,
    settings,
  );

  return {
    ...user,
    cultivation: {
      realmId: view.realm.id,
      realmXp: view.realmXp,
      totalXp: safeTotalXp,
      breakthroughStatus: view.isRealmComplete ? 'READY' : 'CULTIVATING',
      completedQuestIds: current?.completedQuestIds ?? [],
      updatedAt: new Date().toISOString(),
      login: current?.login,
    },
    updatedAt: new Date().toISOString(),
  };
}

async function syncUserCultivationFromLogsUnsafe(
  userId: string,
): Promise<number> {
  const [users, logs, settings] = await Promise.all([
    getUsers(),
    getCultivationLogs(),
    getCultivationSettings(),
  ]);

  const index = users.findIndex((user) => user.id === userId);
  if (index < 0) {
    throw new Error(`Không tìm thấy user cultivation: ${userId}`);
  }

  const hasLedgerEntries = logs.some((log) => log.userId === userId);
  if (!hasLedgerEntries) {
    throw new Error(`Không có cultivation log cho user: ${userId}`);
  }

  const totalXp = calculateCultivationXpFromLogs(logs, userId);
  users[index] = applyTotalXpToUser(users[index], totalXp, settings);
  await saveUsers(users);
  return totalXp;
}

async function updateLoginStateUnsafe(
  userId: string,
  login: NonNullable<CultivationProgress['login']>,
): Promise<void> {
  const users = await getUsers();
  const index = users.findIndex((user) => user.id === userId);
  if (index < 0) return;

  const current = users[index].cultivation;
  users[index] = {
    ...users[index],
    cultivation: {
      ...(current ?? {
        realmId: 'LUYEN_KHI',
        realmXp: 0,
        totalXp: 0,
        breakthroughStatus: 'CULTIVATING' as const,
        completedQuestIds: [],
        updatedAt: new Date().toISOString(),
      }),
      login,
      updatedAt: new Date().toISOString(),
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

  return withCultivationMutationLock(async () => {
    const previousUser = await getUserById(input.userId);
    if (!previousUser) {
      throw new Error(`Không tìm thấy user cultivation: ${input.userId}`);
    }

    const log = createLog(input);
    const result = await grantCultivationLog(log);
    if (!result.granted) return { granted: false, points: 0 };

    await syncUserCultivationFromLogsUnsafe(input.userId);
    const currentUser = await getUserById(input.userId);

    if (currentUser) {
      await announceCultivationRealmChangeIfNeeded({
        userId: input.userId,
        triggerId: log.id,
        previousUser,
        currentUser,
      });
    }

    return { granted: true, points: input.points };
  });
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

  return withCultivationMutationLock(async () => {
    const previousUser = await getUserById(input.userId);
    if (!previousUser) {
      throw new Error(`Không tìm thấy user cultivation: ${input.userId}`);
    }

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

    await syncUserCultivationFromLogsUnsafe(input.userId);
    const currentUser = await getUserById(input.userId);

    if (currentUser) {
      await announceCultivationRealmChangeIfNeeded({
        userId: input.userId,
        triggerId: log.id,
        previousUser,
        currentUser,
      });
    }

    return { reversed: true, points: input.points };
  });
}


/**
 * Ghi một bút toán điều chỉnh thủ công bởi Admin vào cultivation ledger.
 *
 * Điểm âm được giới hạn bằng tổng XP hiện có để tổng ledger không rơi xuống
 * dưới 0. Điều này tránh tạo "nợ XP" khiến các reward tương lai bị nuốt mất.
 */
export async function adjustCultivationByAdmin(input: {
  userId: string;
  adminUserId: string;
  points: number;
  reason: string;
}): Promise<{
  requestedPoints: number;
  appliedPoints: number;
  totalXp: number;
  logId?: string;
}> {
  const requestedPoints = Math.round(Number(input.points) || 0);

  if (!requestedPoints) {
    throw new Error('Số XP điều chỉnh phải khác 0.');
  }

  return withCultivationMutationLock(async () => {
    const [logs, user] = await Promise.all([
      getCultivationLogs(),
      getUserById(input.userId),
    ]);

    if (!user) {
      throw new Error(`Không tìm thấy user cultivation: ${input.userId}`);
    }

    const hasLedgerEntries = logs.some(
      (log) => log.userId === input.userId,
    );
    const storedTotalXp = Math.max(
      0,
      Math.round(
        Number(
          user.cultivation?.totalXp ??
            user.cultivation?.realmXp ??
            0,
        ) || 0,
      ),
    );

    if (!hasLedgerEntries && storedTotalXp > 0) {
      const bootstrapLog = createLog({
        userId: input.userId,
        type: 'ADMIN_ADJUSTMENT',
        points: storedTotalXp,
        targetId: input.userId,
        uniqueKey: `CULTIVATION_LEDGER_BOOTSTRAP:${input.userId}`,
        metadata: {
          reason: 'Bootstrap cultivation ledger từ totalXp đang lưu',
          adminUserId: input.adminUserId,
          source: 'storedTotalXp',
        },
      });
      const bootstrap = await grantCultivationLog(bootstrapLog);

      if (!bootstrap.granted) {
        throw new Error('Không thể bootstrap cultivation ledger.');
      }

      logs.push(bootstrapLog);
    }

    const currentTotalXp = calculateCultivationXpFromLogs(
      logs,
      input.userId,
    );
    const appliedPoints =
      requestedPoints < 0
        ? -Math.min(currentTotalXp, Math.abs(requestedPoints))
        : requestedPoints;

    if (!appliedPoints) {
      return {
        requestedPoints,
        appliedPoints: 0,
        totalXp: currentTotalXp,
      };
    }

    const log = createLog({
      userId: input.userId,
      type: 'ADMIN_ADJUSTMENT',
      points: appliedPoints,
      targetId: input.userId,
      uniqueKey: `ADMIN_ADJUSTMENT:${input.userId}:${randomUUID()}`,
      metadata: {
        reason: input.reason,
        adminUserId: input.adminUserId,
        requestedPoints,
        appliedPoints,
      },
    });

    const result = await grantCultivationLog(log);

    if (!result.granted) {
      throw new Error('Không thể ghi bút toán điều chỉnh cultivation.');
    }

    const previousUser = user;
    const totalXp = await syncUserCultivationFromLogsUnsafe(input.userId);
    const currentUser = await getUserById(input.userId);

    if (currentUser) {
      await announceCultivationRealmChangeIfNeeded({
        userId: input.userId,
        triggerId: log.id,
        previousUser,
        currentUser,
      });
    }

    return {
      requestedPoints,
      appliedPoints,
      totalXp,
      logId: log.id,
    };
  });
}

export async function getCultivationIntegrityReport(
  userId?: string,
): Promise<{
  checkedUsers: number;
  mismatches: Array<{
    userId: string;
    storedTotalXp: number;
    ledgerTotalXp: number;
    delta: number;
  }>;
}> {
  return withCultivationMutationLock(async () => {
    const [users, logs] = await Promise.all([
      getUsers(),
      getCultivationLogs(),
    ]);

    const targets = userId
      ? users.filter((user) => user.id === userId)
      : users;

    const mismatches = targets
      .map((user) => {
        const storedTotalXp = Math.max(
          0,
          Math.round(
            Number(
              user.cultivation?.totalXp ??
                user.cultivation?.realmXp ??
                0,
            ) || 0,
          ),
        );
        const ledgerTotalXp = calculateCultivationXpFromLogs(
          logs,
          user.id,
        );

        return {
          userId: user.id,
          storedTotalXp,
          ledgerTotalXp,
          delta: ledgerTotalXp - storedTotalXp,
        };
      })
      .filter((item) => item.delta !== 0);

    return {
      checkedUsers: targets.length,
      mismatches,
    };
  });
}

export async function rebuildUserCultivationFromLogs(
  userId: string,
): Promise<{ userId: string; totalXp: number }> {
  return withCultivationMutationLock(async () => ({
    userId,
    totalXp: await syncUserCultivationFromLogsUnsafe(userId),
  }));
}

export async function rebuildAllCultivationFromLogs(): Promise<{
  updatedUsers: number;
  skippedUsers: number;
  results: Array<{ userId: string; totalXp: number }>;
}> {
  return withCultivationMutationLock(async () => {
    const [users, logs, settings] = await Promise.all([
      getUsers(),
      getCultivationLogs(),
      getCultivationSettings(),
    ]);

    const usersWithLogs = new Set(logs.map((log) => log.userId));
    const results: Array<{ userId: string; totalXp: number }> = [];

    const nextUsers = users.map((user) => {
      if (!usersWithLogs.has(user.id)) return user;

      const totalXp = calculateCultivationXpFromLogs(logs, user.id);
      results.push({ userId: user.id, totalXp });
      return applyTotalXpToUser(user, totalXp, settings);
    });

    await saveUsers(nextUsers);
    return {
      updatedUsers: results.length,
      skippedUsers: users.length - results.length,
      results,
    };
  });
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

  // A concurrent request may already have granted today's reward.
  if (!daily.granted) return;

  if (streak % 3 === 0) {
    await grantCultivation({
      userId,
      type: 'LOGIN_STREAK_BONUS',
      points: CULTIVATION_POINTS.LOGIN_STREAK_BONUS,
      uniqueKey: `LOGIN_STREAK_BONUS:${userId}:${today}`,
      metadata: { streak, rewardDate: today },
    });
  }

  await withCultivationMutationLock(() =>
    updateLoginStateUnsafe(userId, {
      lastRewardDate: today,
      streak,
    }),
  );
}

export async function rewardFirstModView(
  userId: string,
  modId: string,
): Promise<boolean> {
  const result = await grantCultivation({
    userId,
    type: 'MOD_VIEWED',
    points: CULTIVATION_POINTS.MOD_VIEWED,
    targetId: modId,
    uniqueKey: `MOD_VIEWED:${userId}:${modId}`,
  });

  return result.granted;
}

export async function rewardModPublished(
  userId: string,
  modId: string,
): Promise<{ granted: boolean; points: number }> {
  return grantCultivation({
    userId,
    type: 'MOD_PUBLISHED',
    points: CULTIVATION_POINTS.MOD_PUBLISHED,
    targetId: modId,
    uniqueKey: `MOD_PUBLISHED:${modId}`,
  });
}

export async function revokeModPublished(
  userId: string,
  modId: string,
): Promise<{ reversed: boolean; points: number }> {
  return revokeCultivation({
    userId,
    uniqueKey: `MOD_PUBLISHED:${modId}`,
    type: 'MOD_DELETED',
    points: CULTIVATION_POINTS.MOD_PUBLISHED,
    targetId: modId,
  });
}

export async function rewardModLike(input: {
  ownerUserId: string;
  likerUserId: string;
  modId: string;
}): Promise<{ granted: boolean; points: number }> {
  if (input.ownerUserId === input.likerUserId) {
    return { granted: false, points: 0 };
  }

  return grantCultivation({
    userId: input.ownerUserId,
    type: 'MOD_LIKED',
    points: CULTIVATION_POINTS.MOD_LIKED,
    targetId: input.modId,
    uniqueKey: `MOD_LIKE:${input.modId}:${input.likerUserId}`,
    metadata: { likerUserId: input.likerUserId },
  });
}

export async function revokeModLike(input: {
  ownerUserId: string;
  likerUserId: string;
  modId: string;
}): Promise<{ reversed: boolean; points: number }> {
  if (input.ownerUserId === input.likerUserId) {
    return { reversed: false, points: 0 };
  }

  return revokeCultivation({
    userId: input.ownerUserId,
    uniqueKey: `MOD_LIKE:${input.modId}:${input.likerUserId}`,
    type: 'MOD_UNLIKED',
    points: CULTIVATION_POINTS.MOD_LIKED,
    targetId: input.modId,
    metadata: { likerUserId: input.likerUserId },
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

export async function revokeCommentCreated(input: {
  userId: string;
  commentId: string;
  isReply: boolean;
}): Promise<{ reversed: boolean; points: number }> {
  return revokeCultivation({
    userId: input.userId,
    uniqueKey: `COMMENT_CREATED:${input.commentId}`,
    type: input.isReply ? 'REPLY_DELETED' : 'COMMENT_DELETED',
    points: input.isReply
      ? CULTIVATION_POINTS.REPLY_CREATED
      : CULTIVATION_POINTS.COMMENT_CREATED,
    targetId: input.commentId,
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

export async function rewardCommentHelpful(input: {
  userId: string;
  commentId: string;
  markedByUserId: string;
}): Promise<{ granted: boolean; points: number }> {
  if (input.userId === input.markedByUserId) {
    return { granted: false, points: 0 };
  }

  return grantCultivation({
    userId: input.userId,
    type: 'COMMENT_HELPFUL',
    points: CULTIVATION_POINTS.COMMENT_HELPFUL,
    targetId: input.commentId,
    uniqueKey: `COMMENT_HELPFUL:${input.commentId}`,
    metadata: { markedByUserId: input.markedByUserId },
  });
}

export async function revokeCommentHelpful(input: {
  userId: string;
  commentId: string;
}): Promise<{ reversed: boolean; points: number }> {
  return revokeCultivation({
    userId: input.userId,
    uniqueKey: `COMMENT_HELPFUL:${input.commentId}`,
    type: 'COMMENT_HELPFUL_REMOVED',
    points: CULTIVATION_POINTS.COMMENT_HELPFUL,
    targetId: input.commentId,
  });
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
  const hadAvatar = Boolean(
    input.previousAvatar &&
      !input.previousAvatar.includes('default-avatar'),
  );
  const hasAvatar = Boolean(
    input.nextAvatar &&
      !input.nextAvatar.includes('default-avatar'),
  );
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
