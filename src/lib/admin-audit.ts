import 'server-only';

import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { dataDir } from '@/lib/data-paths';
import { readJsonAtomic, writeJsonAtomic } from '@/lib/stability/atomic-json';

export type AdminAuditAction =
  | 'SYSTEM_INTEGRITY_SCAN'
  | 'SYSTEM_BACKUP_CREATED'
  | 'SYSTEM_BACKUP_PRUNED'
  | 'SYSTEM_BACKUP_DOWNLOADED'
  | 'QUICK_CHECK_COMPLETED'
  | 'RELEASE_CHECK_COMPLETED';

export type AdminAuditLog = {
  id: string;
  actorUserId: string;
  action: AdminAuditAction;
  targetType: string;
  targetId?: string;
  reason?: string;
  requestId?: string;
  before?: unknown;
  after?: unknown;
  metadata?: Record<string, unknown>;
  createdAt: string;
};

const adminAuditLogsPath = path.join(dataDir, 'admin-audit-logs.json');

const globalState = globalThis as typeof globalThis & {
  __modLibraryAdminAuditMutation?: Promise<void>;
};

function withAuditLock<T>(operation: () => Promise<T>): Promise<T> {
  const previous =
    globalState.__modLibraryAdminAuditMutation ?? Promise.resolve();

  let release!: () => void;
  const current = new Promise<void>((resolve) => {
    release = resolve;
  });

  globalState.__modLibraryAdminAuditMutation = previous.then(() => current);

  return previous.then(async () => {
    try {
      return await operation();
    } finally {
      release();
    }
  });
}

function auditRetention(): number {
  const parsed = Number(process.env.ADMIN_AUDIT_RETENTION ?? 5_000);

  if (!Number.isFinite(parsed)) return 5_000;
  return Math.max(500, Math.min(25_000, Math.round(parsed)));
}

function cleanText(value: unknown, maxLength: number): string | undefined {
  const text = String(value ?? '')
    .normalize('NFKC')
    .replace(/\u0000/g, '')
    .trim()
    .slice(0, maxLength);

  return text || undefined;
}

function sanitizeAuditValue(
  value: unknown,
  depth = 0,
): unknown {
  if (depth > 5) return '[DEPTH_LIMIT]';

  if (
    value === null ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  ) {
    return value;
  }

  if (typeof value === 'string') {
    return value.slice(0, 2_000);
  }

  if (Array.isArray(value)) {
    return value
      .slice(0, 100)
      .map((item) => sanitizeAuditValue(item, depth + 1));
  }

  if (typeof value === 'object') {
    const output: Record<string, unknown> = {};

    for (const [key, item] of Object.entries(value).slice(0, 100)) {
      if (/password|secret|token|cookie|authorization|api.?key/i.test(key)) {
        output[key] = '[REDACTED]';
      } else {
        output[key] = sanitizeAuditValue(item, depth + 1);
      }
    }

    return output;
  }

  return String(value).slice(0, 2_000);
}

export async function getAdminAuditLogs(): Promise<AdminAuditLog[]> {
  return readJsonAtomic<AdminAuditLog[]>(adminAuditLogsPath, []);
}

export async function getRecentAdminAuditLogs(
  limit = 100,
): Promise<AdminAuditLog[]> {
  const safeLimit = Math.max(1, Math.min(500, Math.round(limit)));
  const logs = await getAdminAuditLogs();

  return logs
    .slice()
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
    .slice(0, safeLimit);
}

export async function appendAdminAuditLog(input: {
  actorUserId: string;
  action: AdminAuditAction;
  targetType: string;
  targetId?: string;
  reason?: string;
  requestId?: string;
  before?: unknown;
  after?: unknown;
  metadata?: Record<string, unknown>;
}): Promise<AdminAuditLog> {
  return withAuditLock(async () => {
    const logs = await getAdminAuditLogs();
    const created: AdminAuditLog = {
      id: randomUUID(),
      actorUserId: cleanText(input.actorUserId, 200) ?? 'unknown',
      action: input.action,
      targetType: cleanText(input.targetType, 120) ?? 'SYSTEM',
      targetId: cleanText(input.targetId, 300),
      reason: cleanText(input.reason, 1_000),
      requestId: cleanText(input.requestId, 200),
      before: input.before === undefined
        ? undefined
        : sanitizeAuditValue(input.before),
      after: input.after === undefined
        ? undefined
        : sanitizeAuditValue(input.after),
      metadata: input.metadata
        ? (sanitizeAuditValue(input.metadata) as Record<string, unknown>)
        : undefined,
      createdAt: new Date().toISOString(),
    };

    logs.push(created);

    const retention = auditRetention();
    const next = logs.length > retention
      ? logs.slice(logs.length - retention)
      : logs;

    await writeJsonAtomic(adminAuditLogsPath, next);
    return created;
  });
}
