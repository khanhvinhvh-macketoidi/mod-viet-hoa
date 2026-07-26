import 'server-only';

import { randomUUID } from 'node:crypto';
import { getUserById, getUsers, saveUsers } from './users';
import type { ReputationProgress, ReputationStatus, User } from './types';
import {
  calculateReputationPointsFromLogs,
  getReputationLogs,
  grantReputationLog,
  reverseReputationLog,
  type ReputationLog,
  type ReputationLogType,
} from './reputation-repository';
import {
  getReputationSettings,
  getReputationView,
  type ReputationSettings,
} from './reputation';
import {
  announceReputationDemotion,
  announceReputationPromotion,
} from './achievement-announcement-service';

export const REPUTATION_POINTS = {
  COMMENT_HELPFUL: 5,
  REVIEW_HELPFUL: 2,
  MOD_APPROVED: 10,
  REPORT_ACCEPTED: 5,
  MOD_RATING_MILESTONE: 15,
  MOD_FAVORITE_MILESTONE: 20,
} as const;

let reputationMutationQueue: Promise<void> = Promise.resolve();

function withReputationMutationLock<T>(
  operation: () => Promise<T>,
): Promise<T> {
  const previous = reputationMutationQueue;
  let release!: () => void;

  reputationMutationQueue = new Promise<void>((resolve) => {
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
  type: ReputationLogType;
  points: number;
  targetId?: string;
  uniqueKey?: string;
  metadata?: ReputationLog['metadata'];
}): ReputationLog {
  return {
    id: randomUUID(),
    createdAt: new Date().toISOString(),
    ...input,
  };
}

function applyTotalPointsToUser(
  user: User,
  totalPoints: number,
  settings: ReputationSettings,
): User {
  const safeTotalPoints = Math.max(0, Math.round(totalPoints));
  const view = getReputationView(
    {
      reputation: {
        totalPoints: safeTotalPoints,
        tierId: user.reputation?.tierId ?? 'KHONG_CHUT_TIENG_TAM',
        status: user.reputation?.status ?? 'ACTIVE',
        updatedAt: user.reputation?.updatedAt ?? new Date().toISOString(),
      },
    },
    settings,
  );

  return {
    ...user,
    reputation: {
      totalPoints: safeTotalPoints,
      tierId: view.tier.id,
      status: user.reputation?.status ?? 'ACTIVE',
      updatedAt: new Date().toISOString(),
    },
    updatedAt: new Date().toISOString(),
  };
}

async function syncUserReputationFromLogsUnsafe(
  userId: string,
  options?: {
    triggerId?: string;
    announceTransition?: boolean;
  },
): Promise<number> {
  const [users, logs, settings] = await Promise.all([
    getUsers(),
    getReputationLogs(),
    getReputationSettings(),
  ]);

  const index = users.findIndex((user) => user.id === userId);
  if (index < 0) {
    throw new Error(`Không tìm thấy user reputation: ${userId}`);
  }

  const previousView = getReputationView(users[index], settings);
  const totalPoints = calculateReputationPointsFromLogs(logs, userId);
  const nextUser = applyTotalPointsToUser(users[index], totalPoints, settings);
  const currentView = getReputationView(nextUser, settings);

  users[index] = nextUser;
  await saveUsers(users);

  const shouldAnnounce =
    options?.announceTransition !== false &&
    Boolean(options?.triggerId) &&
    currentView.tierIndex !== previousView.tierIndex;

  if (shouldAnnounce && options?.triggerId) {
    const payload = {
      userId,
      triggerId: options.triggerId,
      previous: {
        id: previousView.tier.id,
        name: previousView.tier.name,
        color: previousView.tier.color,
        className: previousView.tier.className,
      },
      current: {
        id: currentView.tier.id,
        name: currentView.tier.name,
        color: currentView.tier.color,
        className: currentView.tier.className,
      },
    };
    const isPromotion = currentView.tierIndex > previousView.tierIndex;

    const announce = isPromotion
      ? announceReputationPromotion
      : announceReputationDemotion;

    await announce(payload).catch((error) => {
      console.error(
        isPromotion
          ? 'Không thể tạo popup thăng Danh vọng:'
          : 'Không thể tạo popup tụt Danh vọng:',
        error,
      );
    });
  }

  return totalPoints;
}

export async function grantReputation(input: {
  userId: string;
  type: ReputationLogType;
  points: number;
  targetId?: string;
  uniqueKey: string;
  metadata?: ReputationLog['metadata'];
  bypassFrozen?: boolean;
}): Promise<{
  granted: boolean;
  points: number;
  totalPoints?: number;
  logId?: string;
  frozen?: boolean;
}> {
  if (input.points <= 0) {
    return { granted: false, points: 0 };
  }

  return withReputationMutationLock(async () => {
    const user = await getUserById(input.userId);
    if (!user) {
      throw new Error(`Không tìm thấy user reputation: ${input.userId}`);
    }

    if (user.reputation?.status === 'FROZEN' && !input.bypassFrozen) {
      return { granted: false, points: 0, frozen: true };
    }

    const log = createLog(input);
    const result = await grantReputationLog(log);
    if (!result.granted) {
      const totalPoints = await syncUserReputationFromLogsUnsafe(
        input.userId,
        {
          triggerId: result.log.id,
          announceTransition: true,
        },
      );

      return {
        granted: false,
        points: 0,
        totalPoints,
        logId: result.log.id,
      };
    }

    const totalPoints = await syncUserReputationFromLogsUnsafe(
      input.userId,
      {
        triggerId: log.id,
        announceTransition: true,
      },
    );

    return {
      granted: true,
      points: input.points,
      totalPoints,
      logId: log.id,
    };
  });
}

export async function revokeReputation(input: {
  userId: string;
  uniqueKey: string;
  type: ReputationLogType;
  points: number;
  targetId?: string;
  metadata?: ReputationLog['metadata'];
}): Promise<{
  reversed: boolean;
  points: number;
  totalPoints?: number;
  logId?: string;
}> {
  if (input.points <= 0) {
    return { reversed: false, points: 0 };
  }

  return withReputationMutationLock(async () => {
    const reversal = createLog({
      userId: input.userId,
      type: input.type,
      points: -input.points,
      targetId: input.targetId,
      uniqueKey: `${input.uniqueKey}:REVERSAL:${randomUUID()}`,
      metadata: input.metadata,
    });

    const result = await reverseReputationLog(
      input.userId,
      input.uniqueKey,
      reversal,
    );

    if (!result.reversed) {
      const totalPoints = await syncUserReputationFromLogsUnsafe(
        input.userId,
        { announceTransition: false },
      );

      return { reversed: false, points: 0, totalPoints };
    }

    const totalPoints = await syncUserReputationFromLogsUnsafe(
      input.userId,
      {
        triggerId: reversal.id,
        announceTransition: true,
      },
    );

    return {
      reversed: true,
      points: input.points,
      totalPoints,
      logId: reversal.id,
    };
  });
}

export async function adjustReputationByAdmin(input: {
  userId: string;
  adminUserId: string;
  points: number;
  reason: string;
}): Promise<{
  requestedPoints: number;
  appliedPoints: number;
  totalPoints: number;
  logId?: string;
}> {
  const requestedPoints = Math.round(Number(input.points) || 0);
  const reason = input.reason.trim();

  if (!requestedPoints) {
    throw new Error('Số Danh vọng điều chỉnh phải khác 0.');
  }

  if (reason.length < 3) {
    throw new Error('Vui lòng nhập lý do điều chỉnh Danh vọng.');
  }

  return withReputationMutationLock(async () => {
    const [logs, user] = await Promise.all([
      getReputationLogs(),
      getUserById(input.userId),
    ]);

    if (!user) {
      throw new Error(`Không tìm thấy user reputation: ${input.userId}`);
    }

    const hasLedgerEntries = logs.some((log) => log.userId === input.userId);
    const storedTotalPoints = Math.max(
      0,
      Math.round(Number(user.reputation?.totalPoints) || 0),
    );

    if (!hasLedgerEntries && storedTotalPoints > 0) {
      const bootstrapLog = createLog({
        userId: input.userId,
        type: 'ADMIN_ADJUSTMENT',
        points: storedTotalPoints,
        targetId: input.userId,
        uniqueKey: `REPUTATION_LEDGER_BOOTSTRAP:${input.userId}`,
        metadata: {
          reason: 'Bootstrap reputation ledger từ totalPoints đang lưu',
          adminUserId: input.adminUserId,
          source: 'storedTotalPoints',
        },
      });
      const bootstrap = await grantReputationLog(bootstrapLog);
      if (!bootstrap.granted) {
        throw new Error('Không thể bootstrap reputation ledger.');
      }
      logs.push(bootstrapLog);
    }

    const currentTotalPoints = calculateReputationPointsFromLogs(
      logs,
      input.userId,
    );
    const appliedPoints =
      requestedPoints < 0
        ? -Math.min(currentTotalPoints, Math.abs(requestedPoints))
        : requestedPoints;

    if (!appliedPoints) {
      return {
        requestedPoints,
        appliedPoints: 0,
        totalPoints: currentTotalPoints,
      };
    }

    const log = createLog({
      userId: input.userId,
      type: 'ADMIN_ADJUSTMENT',
      points: appliedPoints,
      targetId: input.userId,
      uniqueKey: `REPUTATION_ADMIN_ADJUSTMENT:${input.userId}:${randomUUID()}`,
      metadata: {
        reason,
        adminUserId: input.adminUserId,
        requestedPoints,
        appliedPoints,
      },
    });

    const result = await grantReputationLog(log);
    if (!result.granted) {
      throw new Error('Không thể ghi bút toán điều chỉnh Danh vọng.');
    }

    const totalPoints = await syncUserReputationFromLogsUnsafe(
      input.userId,
      {
        triggerId: log.id,
        announceTransition: true,
      },
    );

    return {
      requestedPoints,
      appliedPoints,
      totalPoints,
      logId: log.id,
    };
  });
}

export async function setReputationStatus(input: {
  userId: string;
  status: ReputationStatus;
  adminUserId: string;
}): Promise<ReputationProgress> {
  return withReputationMutationLock(async () => {
    void input.adminUserId;
    const users = await getUsers();
    const index = users.findIndex((user) => user.id === input.userId);
    if (index < 0) {
      throw new Error(`Không tìm thấy user reputation: ${input.userId}`);
    }

    const settings = await getReputationSettings();
    const current = getReputationView(users[index], settings);
    const reputation: ReputationProgress = {
      totalPoints: current.totalPoints,
      tierId: current.tier.id,
      status: input.status,
      updatedAt: new Date().toISOString(),
    };

    users[index] = {
      ...users[index],
      reputation,
      updatedAt: new Date().toISOString(),
    };
    await saveUsers(users);
    return reputation;
  });
}

export async function getReputationIntegrityReport(
  userId?: string,
): Promise<{
  checkedUsers: number;
  mismatches: Array<{
    userId: string;
    storedTotalPoints: number;
    ledgerTotalPoints: number;
    delta: number;
  }>;
}> {
  return withReputationMutationLock(async () => {
    const [users, logs] = await Promise.all([
      getUsers(),
      getReputationLogs(),
    ]);
    const targets = userId
      ? users.filter((user) => user.id === userId)
      : users;

    const mismatches = targets
      .map((user) => {
        const storedTotalPoints = Math.max(
          0,
          Math.round(Number(user.reputation?.totalPoints) || 0),
        );
        const ledgerTotalPoints = calculateReputationPointsFromLogs(
          logs,
          user.id,
        );
        return {
          userId: user.id,
          storedTotalPoints,
          ledgerTotalPoints,
          delta: ledgerTotalPoints - storedTotalPoints,
        };
      })
      .filter((item) => item.delta !== 0);

    return { checkedUsers: targets.length, mismatches };
  });
}

export async function rebuildUserReputationFromLogs(
  userId: string,
): Promise<{ userId: string; totalPoints: number }> {
  return withReputationMutationLock(async () => ({
    userId,
    totalPoints: await syncUserReputationFromLogsUnsafe(userId, {
      announceTransition: false,
    }),
  }));
}

export async function rebuildAllReputationFromLogs(): Promise<{
  updatedUsers: number;
  results: Array<{ userId: string; totalPoints: number }>;
}> {
  return withReputationMutationLock(async () => {
    const [users, logs, settings] = await Promise.all([
      getUsers(),
      getReputationLogs(),
      getReputationSettings(),
    ]);
    const results: Array<{ userId: string; totalPoints: number }> = [];

    const nextUsers = users.map((user) => {
      const totalPoints = calculateReputationPointsFromLogs(logs, user.id);
      results.push({ userId: user.id, totalPoints });
      return applyTotalPointsToUser(user, totalPoints, settings);
    });

    await saveUsers(nextUsers);
    return { updatedUsers: results.length, results };
  });
}

export async function rewardCommentHelpfulReputation(input: {
  userId: string;
  commentId: string;
  markedByUserId: string;
}) {
  if (input.userId === input.markedByUserId) {
    return { granted: false, points: 0 };
  }

  return grantReputation({
    userId: input.userId,
    type: 'COMMENT_HELPFUL',
    points: REPUTATION_POINTS.COMMENT_HELPFUL,
    targetId: input.commentId,
    uniqueKey: `REPUTATION:COMMENT_HELPFUL:${input.commentId}`,
    metadata: { markedByUserId: input.markedByUserId },
  });
}

export async function revokeCommentHelpfulReputation(input: {
  userId: string;
  commentId: string;
}) {
  return revokeReputation({
    userId: input.userId,
    uniqueKey: `REPUTATION:COMMENT_HELPFUL:${input.commentId}`,
    type: 'COMMENT_HELPFUL_REMOVED',
    points: REPUTATION_POINTS.COMMENT_HELPFUL,
    targetId: input.commentId,
  });
}

export async function rewardModApprovedReputation(
  userId: string,
  modId: string,
) {
  return grantReputation({
    userId,
    type: 'MOD_APPROVED',
    points: REPUTATION_POINTS.MOD_APPROVED,
    targetId: modId,
    uniqueKey: `REPUTATION:MOD_APPROVED:${modId}`,
  });
}

export async function revokeModApprovedReputation(
  userId: string,
  modId: string,
) {
  return revokeReputation({
    userId,
    uniqueKey: `REPUTATION:MOD_APPROVED:${modId}`,
    type: 'MOD_REMOVED',
    points: REPUTATION_POINTS.MOD_APPROVED,
    targetId: modId,
  });
}

export async function rewardReviewHelpfulReputation(input: {
  userId: string;
  reviewId: string;
  voterUserId: string;
}) {
  if (input.userId === input.voterUserId) {
    return { granted: false, points: 0 };
  }

  return grantReputation({
    userId: input.userId,
    type: 'REVIEW_HELPFUL',
    points: REPUTATION_POINTS.REVIEW_HELPFUL,
    targetId: input.reviewId,
    uniqueKey: `REPUTATION:REVIEW_HELPFUL:${input.reviewId}:${input.voterUserId}`,
    metadata: { voterUserId: input.voterUserId },
  });
}

export async function revokeReviewHelpfulReputation(input: {
  userId: string;
  reviewId: string;
  voterUserId: string;
}) {
  return revokeReputation({
    userId: input.userId,
    uniqueKey: `REPUTATION:REVIEW_HELPFUL:${input.reviewId}:${input.voterUserId}`,
    type: 'REVIEW_HELPFUL_REMOVED',
    points: REPUTATION_POINTS.REVIEW_HELPFUL,
    targetId: input.reviewId,
    metadata: { voterUserId: input.voterUserId },
  });
}

export async function rewardAcceptedReportReputation(input: {
  userId: string;
  reportId: string;
  resolvedByUserId: string;
}) {
  return grantReputation({
    userId: input.userId,
    type: 'REPORT_ACCEPTED',
    points: REPUTATION_POINTS.REPORT_ACCEPTED,
    targetId: input.reportId,
    uniqueKey: `REPUTATION:REPORT_ACCEPTED:${input.reportId}`,
    metadata: { resolvedByUserId: input.resolvedByUserId },
  });
}

export async function rewardModRatingMilestoneReputation(input: {
  userId: string;
  modId: string;
  milestone: string;
}) {
  return grantReputation({
    userId: input.userId,
    type: 'MOD_RATING_MILESTONE',
    points: REPUTATION_POINTS.MOD_RATING_MILESTONE,
    targetId: input.modId,
    uniqueKey: `REPUTATION:MOD_RATING_MILESTONE:${input.modId}:${input.milestone}`,
    metadata: { milestone: input.milestone },
  });
}

export async function rewardModFavoriteMilestoneReputation(input: {
  userId: string;
  modId: string;
  milestone: string;
}) {
  return grantReputation({
    userId: input.userId,
    type: 'MOD_FAVORITE_MILESTONE',
    points: REPUTATION_POINTS.MOD_FAVORITE_MILESTONE,
    targetId: input.modId,
    uniqueKey: `REPUTATION:MOD_FAVORITE_MILESTONE:${input.modId}:${input.milestone}`,
    metadata: { milestone: input.milestone },
  });
}

export async function rewardTranslationReputation(input: {
  userId: string;
  contributionId: string;
  points: number;
  approvedByUserId: string;
  reason: string;
}) {
  return grantReputation({
    userId: input.userId,
    type: 'TRANSLATION_ACCEPTED',
    points: Math.max(1, Math.round(input.points)),
    targetId: input.contributionId,
    uniqueKey: `REPUTATION:TRANSLATION_ACCEPTED:${input.contributionId}`,
    metadata: {
      approvedByUserId: input.approvedByUserId,
      reason: input.reason,
    },
  });
}
