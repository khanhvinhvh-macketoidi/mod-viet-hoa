import 'server-only';

import path from 'node:path';
import { dataDir } from './data-paths';
import { readJson, writeJson } from './json-store';

export type ReputationLogType =
  | 'COMMENT_HELPFUL'
  | 'COMMENT_HELPFUL_REMOVED'
  | 'REVIEW_HELPFUL'
  | 'REVIEW_HELPFUL_REMOVED'
  | 'MOD_APPROVED'
  | 'MOD_REMOVED'
  | 'REPORT_ACCEPTED'
  | 'MOD_RATING_MILESTONE'
  | 'MOD_FAVORITE_MILESTONE'
  | 'TRANSLATION_ACCEPTED'
  | 'GUIDE_APPROVED'
  | 'PENALTY'
  | 'ADMIN_ADJUSTMENT';

export type ReputationLog = {
  id: string;
  userId: string;
  type: ReputationLogType;
  points: number;
  targetId?: string;
  uniqueKey?: string;
  createdAt: string;
  reversedAt?: string;
  reversalLogId?: string;
  metadata?: Record<string, string | number | boolean | null>;
};

export const reputationLogsPath = path.join(
  dataDir,
  'reputation-logs.json',
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

export async function getReputationLogs(): Promise<ReputationLog[]> {
  return readJson<ReputationLog[]>(reputationLogsPath, []);
}

export async function saveReputationLogs(
  logs: ReputationLog[],
): Promise<void> {
  await writeJson(reputationLogsPath, logs);
}

export function calculateReputationPointsFromLogs(
  logs: ReputationLog[],
  userId: string,
): number {
  return Math.max(
    0,
    Math.round(
      logs
        .filter((log) => log.userId === userId)
        .reduce((total, log) => total + Number(log.points || 0), 0),
    ),
  );
}

export async function hasActiveReputationLog(
  userId: string,
  uniqueKey: string,
): Promise<boolean> {
  const logs = await getReputationLogs();
  return logs.some(
    (log) =>
      log.userId === userId &&
      log.uniqueKey === uniqueKey &&
      !log.reversedAt,
  );
}

export async function grantReputationLog(
  log: ReputationLog,
): Promise<{ granted: boolean; log: ReputationLog }> {
  return withMutationLock(async () => {
    const logs = await getReputationLogs();

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
    await saveReputationLogs(logs);
    return { granted: true, log };
  });
}

export async function reverseReputationLog(
  userId: string,
  uniqueKey: string,
  reversal: ReputationLog,
): Promise<{ reversed: boolean; log?: ReputationLog }> {
  return withMutationLock(async () => {
    const logs = await getReputationLogs();
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
    await saveReputationLogs(logs);

    return { reversed: true, log: reversal };
  });
}
