import 'server-only';

import path from 'node:path';
import { dataDir } from './data-paths';
import { readJson, writeJson } from './json-store';

export type CultivationLogType =
  | 'DAILY_LOGIN'
  | 'LOGIN_STREAK_BONUS'
  | 'COMMENT_CREATED'
  | 'COMMENT_DELETED'
  | 'REPLY_CREATED'
  | 'REPLY_DELETED'
  | 'COMMENT_LIKED'
  | 'COMMENT_UNLIKED'
  | 'COMMENT_HELPFUL'
  | 'COMMENT_HELPFUL_REMOVED'
  | 'MOD_VIEWED'
  | 'MOD_LIKED'
  | 'MOD_UNLIKED'
  | 'REVIEW_CREATED'
  | 'REVIEW_CONTENT_ADDED'
  | 'REVIEW_CONTENT_REMOVED'
  | 'REVIEW_DELETED'
  | 'MOD_PUBLISHED'
  | 'MOD_DELETED'
  | 'AVATAR_ADDED'
  | 'AVATAR_REMOVED'
  | 'AVATAR_RESTORED'
  | 'BIO_ADDED'
  | 'BIO_REMOVED'
  | 'BIO_RESTORED'
  | 'TRANSLATION_FEEDBACK'
  | 'REFERRAL_REWARD'
  | 'ADMIN_ADJUSTMENT';

export type CultivationLog = {
  id: string;
  userId: string;
  type: CultivationLogType;
  points: number;
  targetId?: string;
  uniqueKey?: string;
  createdAt: string;
  reversedAt?: string;
  reversalLogId?: string;
  metadata?: Record<string, string | number | boolean | null>;
};

export type ModViewRecord = {
  userId: string;
  modId: string;
  firstViewedAt: string;
};

export const cultivationLogsPath = path.join(dataDir, 'cultivation-logs.json');
export const cultivationModViewsPath = path.join(dataDir, 'cultivation-mod-views.json');

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

export async function getCultivationLogs(): Promise<CultivationLog[]> {
  return readJson<CultivationLog[]>(cultivationLogsPath, []);
}

export async function saveCultivationLogs(logs: CultivationLog[]): Promise<void> {
  await writeJson(cultivationLogsPath, logs);
}

export function calculateCultivationXpFromLogs(
  logs: CultivationLog[],
  userId: string,
): number {
  /*
   * Cultivation logs are an append-only ledger:
   * - the original positive grant remains part of history;
   * - a reversal appends a negative entry;
   * - reversedAt only prevents the same grant from being reversed twice.
   *
   * Therefore total XP must sum every ledger entry, not only entries without
   * reversedAt. Filtering the original grant out would subtract the reward
   * twice when its negative reversal entry is also present.
   */
  return Math.max(
    0,
    Math.round(
      logs
        .filter((log) => log.userId === userId)
        .reduce((total, log) => total + Number(log.points || 0), 0),
    ),
  );
}

export async function hasActiveCultivationLog(
  userId: string,
  uniqueKey: string,
): Promise<boolean> {
  const logs = await getCultivationLogs();
  return logs.some(
    (log) =>
      log.userId === userId &&
      log.uniqueKey === uniqueKey &&
      !log.reversedAt,
  );
}

export async function appendCultivationLog(
  log: CultivationLog,
): Promise<void> {
  await withMutationLock(async () => {
    const logs = await getCultivationLogs();
    logs.push(log);
    await saveCultivationLogs(logs);
  });
}

export async function grantCultivationLog(
  log: CultivationLog,
): Promise<{ granted: boolean; log: CultivationLog }> {
  return withMutationLock(async () => {
    const logs = await getCultivationLogs();

    if (
      log.uniqueKey &&
      logs.some(
        (item) =>
          item.userId === log.userId &&
          item.uniqueKey === log.uniqueKey &&
          !item.reversedAt,
      )
    ) {
      return { granted: false, log };
    }

    logs.push(log);
    await saveCultivationLogs(logs);
    return { granted: true, log };
  });
}

export async function reverseCultivationLog(
  userId: string,
  uniqueKey: string,
  reversal: CultivationLog,
): Promise<{ reversed: boolean; log?: CultivationLog }> {
  return withMutationLock(async () => {
    const logs = await getCultivationLogs();
    const index = logs.findIndex(
      (item) =>
        item.userId === userId &&
        item.uniqueKey === uniqueKey &&
        !item.reversedAt,
    );

    if (index < 0) {
      return { reversed: false };
    }

    const now = new Date().toISOString();
    logs[index] = {
      ...logs[index],
      reversedAt: now,
      reversalLogId: reversal.id,
    };
    logs.push(reversal);
    await saveCultivationLogs(logs);

    return { reversed: true, log: reversal };
  });
}

/**
 * Legacy compatibility only. New mod-view rewards use the cultivation log
 * unique key as the single source of truth.
 */
export async function getModViews(): Promise<ModViewRecord[]> {
  return readJson<ModViewRecord[]>(cultivationModViewsPath, []);
}

/**
 * Legacy compatibility only. Kept so old code/data migrations continue to
 * compile, but the live reward flow no longer depends on this separate file.
 */
export async function recordFirstModView(
  userId: string,
  modId: string,
): Promise<boolean> {
  return withMutationLock(async () => {
    const views = await getModViews();
    const exists = views.some(
      (item) => item.userId === userId && item.modId === modId,
    );

    if (exists) return false;

    views.push({
      userId,
      modId,
      firstViewedAt: new Date().toISOString(),
    });
    await writeJson(cultivationModViewsPath, views);
    return true;
  });
}
