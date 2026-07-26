import 'server-only';

import { createHash, randomUUID } from 'node:crypto';
import type { Dirent } from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';
import { appendAdminAuditLog, getRecentAdminAuditLogs, type AdminAuditLog } from '@/lib/admin-audit';
import { dataDir } from '@/lib/data-paths';
import { readJsonAtomic, writeJsonAtomic } from '@/lib/stability/atomic-json';
import { createStoredZip } from '@/lib/zip-archive';

export type SystemIssueSeverity =
  | 'CRITICAL'
  | 'ERROR'
  | 'WARNING'
  | 'INFO';

export type SystemIntegrityIssue = {
  id: string;
  severity: SystemIssueSeverity;
  category:
    | 'JSON'
    | 'RELATION'
    | 'LEDGER'
    | 'STORAGE'
    | 'UPLOAD_SESSION'
    | 'DUPLICATE';
  file?: string;
  recordId?: string;
  message: string;
  recommendation: string;
};

export type JsonFileHealth = {
  name: string;
  bytes: number;
  modifiedAt: string;
  sha256: string;
  parseOk: boolean;
  topLevelType?: 'array' | 'object' | 'primitive';
  recordCount?: number;
  error?: string;
};

export type StorageFileSummary = {
  relativePath: string;
  bytes: number;
  modifiedAt: string;
};

export type StorageDirectorySummary = {
  name: string;
  fileCount: number;
  directoryCount: number;
  totalBytes: number;
  largestFileBytes: number;
  filesOlderThan24Hours: number;
  filesOlderThan7Days: number;
};

export type StorageInventory = {
  exists: boolean;
  writable: boolean;
  fileCount: number;
  directoryCount: number;
  totalBytes: number;
  largestFiles: StorageFileSummary[];
  directories: StorageDirectorySummary[];
  uploadSessions: {
    total: number;
    stale: number;
    corrupt: number;
    totalBytes: number;
  };
};

export type RuntimeBackupInfo = {
  id: string;
  createdAt: string;
  bytes: number;
  fileCount?: number;
};

export type SystemRuntimeContext = {
  processId: number;
  projectRoot: string;
  dataRoot: string;
  storageRoot: string;
};

export type SystemIntegrityReport = {
  id: string;
  createdAt: string;
  createdByUserId: string;
  durationMs: number;
  truncated: boolean;
  runtime?: SystemRuntimeContext;
  summary: {
    filesScanned: number;
    recordsScanned: number;
    critical: number;
    errors: number;
    warnings: number;
    info: number;
    missingStorageFiles: number;
    orphanStorageFiles: number;
  };
  issues: SystemIntegrityIssue[];
};

export type SystemOverview = {
  generatedAt: string;
  status: 'ok' | 'degraded';
  runtime: SystemRuntimeContext;
  application: {
    version: string;
    nodeEnv: string;
    uptimeSeconds: number;
  };
  disk: {
    totalBytes?: number;
    freeBytes?: number;
    freePercent?: number;
    error?: string;
  };
  directories: {
    data: { exists: boolean; readable: boolean; writable: boolean };
    storage: { exists: boolean; readable: boolean; writable: boolean };
    backups: { exists: boolean; readable: boolean; writable: boolean };
  };
  jsonFiles: JsonFileHealth[];
  storage: StorageInventory;
  backups: RuntimeBackupInfo[];
  latestIntegrityReport: SystemIntegrityReport | null;
  auditLogs: AdminAuditLog[];
};

type JsonRecord = Record<string, unknown>;

type ParsedJsonFile = {
  health: JsonFileHealth;
  value?: unknown;
};

const storageRoot = path.resolve(process.cwd(), 'storage');
const integrityReportsPath = path.join(
  dataDir,
  'system-integrity-reports.json',
);
const MAX_REPORTED_ISSUES = 1_000;
const IN_FLIGHT_UPLOAD_SESSION_WINDOW_MS = 5 * 60 * 1_000;
const ORPHAN_SETTLE_DELAY_MS = 300;
const CORE_JSON_FILES = ['users.json', 'mods.json'] as const;
const BACKUP_FILE_PATTERN = /^runtime-backup-\d{8}-\d{6}-[a-f0-9]{8}\.zip$/;

const globalState = globalThis as typeof globalThis & {
  __modLibraryIntegrityMutation?: Promise<void>;
  __modLibraryBackupMutation?: Promise<void>;
};

function withGlobalLock<T>(
  key: '__modLibraryIntegrityMutation' | '__modLibraryBackupMutation',
  operation: () => Promise<T>,
): Promise<T> {
  const previous = globalState[key] ?? Promise.resolve();
  let release!: () => void;
  const current = new Promise<void>((resolve) => {
    release = resolve;
  });

  globalState[key] = previous.then(() => current);

  return previous.then(async () => {
    try {
      return await operation();
    } finally {
      release();
    }
  });
}

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function recordArray(value: unknown): JsonRecord[] {
  return Array.isArray(value) ? value.filter(isRecord) : [];
}

function textValue(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function numericValue(value: unknown): number | undefined {
  const number = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(number) ? number : undefined;
}

function sha256(data: Uint8Array): string {
  return createHash('sha256').update(data).digest('hex');
}

function formatError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function runtimeContext(): SystemRuntimeContext {
  return {
    processId: process.pid,
    projectRoot: path.resolve(process.cwd()),
    dataRoot: path.resolve(dataDir),
    storageRoot: path.resolve(storageRoot),
  };
}

function canonicalFileSystemPath(value: string): string {
  const resolved = path.resolve(value);
  return process.platform === 'win32' ? resolved.toLocaleLowerCase('en-US') : resolved;
}

type CurrentStorageFile = {
  absolutePath: string;
  bytes: number;
  modifiedAt: Date;
  changedAt: Date;
};

async function confirmCurrentStorageFile(
  absolutePath: string,
): Promise<CurrentStorageFile | null> {
  const expectedPath = path.resolve(absolutePath);
  const expectedKey = canonicalFileSystemPath(expectedPath);
  const directory = path.dirname(expectedPath);

  try {
    const entries = await fs.readdir(directory, { withFileTypes: true });
    const currentEntry = entries.find(
      (entry) =>
        entry.isFile() &&
        canonicalFileSystemPath(path.join(directory, entry.name)) === expectedKey,
    );

    if (!currentEntry) return null;

    const currentPath = path.join(directory, currentEntry.name);
    const firstStats = await fs.stat(currentPath);

    if (!firstStats.isFile()) return null;

    // Confirm again after a short settle interval. This prevents a payload
    // moved into uploads and immediately rolled back from becoming a warning.
    await new Promise<void>((resolve) => setTimeout(resolve, 50));

    const secondStats = await fs.stat(currentPath);

    if (!secondStats.isFile()) return null;

    return {
      absolutePath: currentPath,
      bytes: secondStats.size,
      modifiedAt: secondStats.mtime,
      changedAt: secondStats.ctime,
    };
  } catch {
    return null;
  }
}

async function belongsToLiveUploadTransaction(
  file: CurrentStorageFile,
): Promise<boolean> {
  const sessionsRoot = path.join(storageRoot, 'upload-sessions');
  const entries = await fs
    .readdir(sessionsRoot, { withFileTypes: true })
    .catch(() => [] as Dirent[]);
  const fileName = path.basename(file.absolutePath);
  const now = Date.now();

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;

    try {
      const raw = await fs.readFile(
        path.join(sessionsRoot, entry.name, 'manifest.json'),
        'utf8',
      );
      const manifest = JSON.parse(raw) as JsonRecord;
      const safeOriginalFileName = textValue(
        manifest.safeOriginalFileName,
      );
      const totalBytes = numericValue(manifest.totalBytes);
      const updatedAt = Date.parse(textValue(manifest.updatedAt));
      const status = textValue(manifest.status);

      if (
        !safeStoredName(safeOriginalFileName) ||
        totalBytes === undefined ||
        totalBytes < 0 ||
        !Number.isFinite(updatedAt) ||
        now - updatedAt > IN_FLIGHT_UPLOAD_SESSION_WINDOW_MS
      ) {
        continue;
      }

      if (
        (status === 'READY' || status === 'CONSUMING') &&
        file.bytes === totalBytes &&
        fileName.endsWith(`-${safeOriginalFileName}`)
      ) {
        return true;
      }
    } catch {
      // Corrupt sessions are reported separately.
    }
  }

  return false;
}

async function settleOrphanCandidate(
  file: CurrentStorageFile,
): Promise<CurrentStorageFile | null> {
  if (await belongsToLiveUploadTransaction(file)) {
    return null;
  }

  await new Promise<void>((resolve) => {
    setTimeout(resolve, ORPHAN_SETTLE_DELAY_MS);
  });

  const confirmed = await confirmCurrentStorageFile(file.absolutePath);

  if (!confirmed) return null;

  if (await belongsToLiveUploadTransaction(confirmed)) {
    return null;
  }

  return confirmed;
}

async function accessStatus(targetPath: string): Promise<{
  exists: boolean;
  readable: boolean;
  writable: boolean;
}> {
  try {
    await fs.access(targetPath);
    const [readable, writable] = await Promise.all([
      fs.access(targetPath, fs.constants.R_OK).then(() => true).catch(() => false),
      fs.access(targetPath, fs.constants.W_OK).then(() => true).catch(() => false),
    ]);

    return { exists: true, readable, writable };
  } catch {
    return { exists: false, readable: false, writable: false };
  }
}

async function listDataJsonFileNames(): Promise<string[]> {
  try {
    const entries = await fs.readdir(dataDir, { withFileTypes: true });

    return entries
      .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith('.json'))
      .map((entry) => entry.name)
      .sort((left, right) => left.localeCompare(right));
  } catch {
    return [];
  }
}

async function inspectJsonFile(fileName: string): Promise<ParsedJsonFile> {
  const filePath = path.join(dataDir, fileName);

  try {
    const [data, stats] = await Promise.all([
      fs.readFile(filePath),
      fs.stat(filePath),
    ]);

    const health: JsonFileHealth = {
      name: fileName,
      bytes: stats.size,
      modifiedAt: stats.mtime.toISOString(),
      sha256: sha256(data),
      parseOk: false,
    };

    try {
      const raw = data.toString('utf8');
      const value = JSON.parse(raw) as unknown;
      health.parseOk = true;

      if (Array.isArray(value)) {
        health.topLevelType = 'array';
        health.recordCount = value.length;
      } else if (isRecord(value)) {
        health.topLevelType = 'object';
        health.recordCount = Object.keys(value).length;
      } else {
        health.topLevelType = 'primitive';
        health.recordCount = value === null ? 0 : 1;
      }

      return { health, value };
    } catch (error) {
      health.error = formatError(error).slice(0, 500);
      return { health };
    }
  } catch (error) {
    return {
      health: {
        name: fileName,
        bytes: 0,
        modifiedAt: '',
        sha256: '',
        parseOk: false,
        error: formatError(error).slice(0, 500),
      },
    };
  }
}

async function readJsonInventory(): Promise<Map<string, ParsedJsonFile>> {
  const names = await listDataJsonFileNames();
  const inspected = await Promise.all(names.map(inspectJsonFile));
  const output = new Map<string, ParsedJsonFile>();

  names.forEach((name, index) => {
    const item = inspected[index];
    if (item) output.set(name, item);
  });

  return output;
}

async function walkDirectory(root: string): Promise<{
  files: Array<{ absolutePath: string; relativePath: string; bytes: number; modifiedAt: Date }>;
  directoryCount: number;
}> {
  const files: Array<{
    absolutePath: string;
    relativePath: string;
    bytes: number;
    modifiedAt: Date;
  }> = [];
  let directoryCount = 0;

  async function visit(directory: string): Promise<void> {
    let entries: Dirent[];

    try {
      entries = await fs.readdir(directory, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      const absolutePath = path.join(directory, entry.name);

      if (entry.isDirectory()) {
        directoryCount += 1;
        await visit(absolutePath);
      } else if (entry.isFile()) {
        try {
          const stats = await fs.stat(absolutePath);
          files.push({
            absolutePath,
            relativePath: path.relative(root, absolutePath).replace(/\\/g, '/'),
            bytes: stats.size,
            modifiedAt: stats.mtime,
          });
        } catch {
          // File may disappear during the scan. The next scan will reconcile it.
        }
      }
    }
  }

  await visit(root);
  return { files, directoryCount };
}

async function inspectUploadSessions(): Promise<StorageInventory['uploadSessions']> {
  const sessionsRoot = path.join(storageRoot, 'upload-sessions');
  let entries: Dirent[];

  try {
    entries = await fs.readdir(sessionsRoot, { withFileTypes: true });
  } catch {
    return { total: 0, stale: 0, corrupt: 0, totalBytes: 0 };
  }

  let total = 0;
  let stale = 0;
  let corrupt = 0;
  let totalBytes = 0;

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    total += 1;
    const directory = path.join(sessionsRoot, entry.name);

    try {
      const [raw, payloadStats] = await Promise.all([
        fs.readFile(path.join(directory, 'manifest.json'), 'utf8'),
        fs.stat(path.join(directory, 'payload.part')).catch(() => null),
      ]);
      const manifest = JSON.parse(raw) as JsonRecord;
      const updatedAt = Date.parse(textValue(manifest.updatedAt));

      if (!Number.isFinite(updatedAt)) {
        corrupt += 1;
      } else if (Date.now() - updatedAt >= 24 * 60 * 60 * 1_000) {
        stale += 1;
      }

      if (payloadStats) totalBytes += payloadStats.size;
    } catch {
      corrupt += 1;
    }
  }

  return { total, stale, corrupt, totalBytes };
}

export async function getStorageInventory(): Promise<StorageInventory> {
  const status = await accessStatus(storageRoot);

  if (!status.exists) {
    return {
      exists: false,
      writable: false,
      fileCount: 0,
      directoryCount: 0,
      totalBytes: 0,
      largestFiles: [],
      directories: [],
      uploadSessions: { total: 0, stale: 0, corrupt: 0, totalBytes: 0 },
    };
  }

  const walked = await walkDirectory(storageRoot);
  const topLevelNames = await fs
    .readdir(storageRoot, { withFileTypes: true })
    .then((entries) => entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name))
    .catch(() => [] as string[]);
  const now = Date.now();

  const directories = topLevelNames
    .map((name): StorageDirectorySummary => {
      const prefix = `${name}/`;
      const files = walked.files.filter((file) => file.relativePath.startsWith(prefix));
      const directRoot = path.join(storageRoot, name);
      const nestedDirectories = new Set(
        files
          .map((file) => path.dirname(file.absolutePath))
          .filter((directory) => directory !== directRoot),
      );

      return {
        name,
        fileCount: files.length,
        directoryCount: nestedDirectories.size,
        totalBytes: files.reduce((sum, file) => sum + file.bytes, 0),
        largestFileBytes: files.reduce((largest, file) => Math.max(largest, file.bytes), 0),
        filesOlderThan24Hours: files.filter(
          (file) => now - file.modifiedAt.getTime() >= 24 * 60 * 60 * 1_000,
        ).length,
        filesOlderThan7Days: files.filter(
          (file) => now - file.modifiedAt.getTime() >= 7 * 24 * 60 * 60 * 1_000,
        ).length,
      };
    })
    .sort((left, right) => right.totalBytes - left.totalBytes);

  return {
    exists: true,
    writable: status.writable,
    fileCount: walked.files.length,
    directoryCount: walked.directoryCount,
    totalBytes: walked.files.reduce((sum, file) => sum + file.bytes, 0),
    largestFiles: walked.files
      .slice()
      .sort((left, right) => right.bytes - left.bytes)
      .slice(0, 20)
      .map((file) => ({
        relativePath: file.relativePath,
        bytes: file.bytes,
        modifiedAt: file.modifiedAt.toISOString(),
      })),
    directories,
    uploadSessions: await inspectUploadSessions(),
  };
}

function backupDirectory(): string {
  const projectRoot = path.resolve(process.cwd());
  const configured = process.env.RUNTIME_BACKUP_DIR?.trim();
  const resolved = path.resolve(
    configured || path.join(path.dirname(projectRoot), `${path.basename(projectRoot)}-runtime-backups`),
  );

  if (resolved === projectRoot || resolved.startsWith(`${projectRoot}${path.sep}`)) {
    throw new Error('RUNTIME_BACKUP_DIR phải nằm ngoài thư mục source của dự án.');
  }

  return resolved;
}

function backupRetention(): number {
  const parsed = Number(process.env.RUNTIME_BACKUP_RETENTION ?? 30);
  if (!Number.isFinite(parsed)) return 30;
  return Math.max(5, Math.min(100, Math.round(parsed)));
}

function backupMaxBytes(): number {
  const parsed = Number(process.env.RUNTIME_BACKUP_MAX_BYTES ?? 64 * 1024 * 1024);
  if (!Number.isFinite(parsed)) return 64 * 1024 * 1024;
  return Math.max(8 * 1024 * 1024, Math.min(512 * 1024 * 1024, Math.round(parsed)));
}

function backupId(date = new Date()): string {
  const values = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  const parts = Object.fromEntries(values.map((item) => [item.type, item.value]));
  const datePart = `${parts.year ?? '0000'}${parts.month ?? '00'}${parts.day ?? '00'}`;
  const timePart = `${parts.hour ?? '00'}${parts.minute ?? '00'}${parts.second ?? '00'}`;
  return `runtime-backup-${datePart}-${timePart}-${randomUUID().replace(/-/g, '').slice(0, 8)}.zip`;
}

export async function listRuntimeBackups(): Promise<RuntimeBackupInfo[]> {
  let directory: string;

  try {
    directory = backupDirectory();
    await fs.mkdir(directory, { recursive: true });
  } catch {
    return [];
  }

  const entries = await fs.readdir(directory, { withFileTypes: true }).catch(() => []);
  const backups: RuntimeBackupInfo[] = [];

  for (const entry of entries) {
    if (!entry.isFile() || !BACKUP_FILE_PATTERN.test(entry.name)) continue;

    try {
      const stats = await fs.stat(path.join(directory, entry.name));
      backups.push({
        id: entry.name,
        createdAt: stats.mtime.toISOString(),
        bytes: stats.size,
      });
    } catch {
      // Ignore a backup removed concurrently.
    }
  }

  return backups.sort((left, right) => right.createdAt.localeCompare(left.createdAt));
}

export function resolveRuntimeBackupPath(id: string): string {
  if (!BACKUP_FILE_PATTERN.test(id) || path.basename(id) !== id) {
    throw new Error('Tên backup không hợp lệ.');
  }

  return path.join(backupDirectory(), id);
}

export async function createRuntimeBackup(input: {
  actorUserId: string;
  requestId?: string;
  reason?: string;
}): Promise<RuntimeBackupInfo> {
  return withGlobalLock('__modLibraryBackupMutation', async () => {
    const fileNames = await listDataJsonFileNames();

    if (fileNames.length === 0) {
      throw new Error('Không tìm thấy file JSON runtime để backup.');
    }

    const entries: Array<{ name: string; data: Uint8Array; modifiedAt?: Date }> = [];
    const manifestFiles: Array<{
      path: string;
      bytes: number;
      sha256: string;
      modifiedAt: string;
      parseOk: boolean;
      parseError?: string;
    }> = [];
    let totalBytes = 0;

    for (const fileName of fileNames) {
      const filePath = path.join(dataDir, fileName);
      const [data, stats] = await Promise.all([fs.readFile(filePath), fs.stat(filePath)]);
      totalBytes += data.byteLength;

      if (totalBytes > backupMaxBytes()) {
        throw new Error(
          'Tổng JSON runtime vượt giới hạn backup trong bộ nhớ. Hãy tăng RUNTIME_BACKUP_MAX_BYTES có kiểm soát.',
        );
      }

      let parseOk = true;
      let parseError: string | undefined;

      try {
        JSON.parse(data.toString('utf8'));
      } catch (error) {
        parseOk = false;
        parseError = formatError(error).slice(0, 500);
      }

      entries.push({
        name: `data/${fileName}`,
        data,
        modifiedAt: stats.mtime,
      });
      manifestFiles.push({
        path: `data/${fileName}`,
        bytes: data.byteLength,
        sha256: sha256(data),
        modifiedAt: stats.mtime.toISOString(),
        parseOk,
        parseError,
      });
    }

    const createdAt = new Date().toISOString();
    const manifest = Buffer.from(
      `${JSON.stringify(
        {
          format: 'MOD_VIET_HOA_RUNTIME_BACKUP_V1',
          createdAt,
          createdByUserId: input.actorUserId,
          applicationVersion: await readApplicationVersion(),
          fileCount: manifestFiles.length,
          totalBytes,
          files: manifestFiles,
        },
        null,
        2,
      )}\n`,
      'utf8',
    );

    entries.push({
      name: 'BACKUP_MANIFEST.json',
      data: manifest,
      modifiedAt: new Date(createdAt),
    });

    const archive = createStoredZip(entries);
    const directory = backupDirectory();
    const id = backupId();
    const targetPath = path.join(directory, id);
    const temporaryPath = `${targetPath}.${process.pid}.${randomUUID()}.tmp`;

    await fs.mkdir(directory, { recursive: true });

    try {
      await fs.writeFile(temporaryPath, archive, { flag: 'wx' });
      await fs.rename(temporaryPath, targetPath);
    } catch (error) {
      await fs.rm(temporaryPath, { force: true }).catch(() => undefined);
      throw error;
    }

    const backups = await listRuntimeBackups();
    const retention = backupRetention();
    const pruned: string[] = [];

    for (const item of backups.slice(retention)) {
      await fs.rm(resolveRuntimeBackupPath(item.id), { force: true });
      pruned.push(item.id);
    }

    const result: RuntimeBackupInfo = {
      id,
      createdAt,
      bytes: archive.byteLength,
      fileCount: manifestFiles.length,
    };

    await appendAdminAuditLog({
      actorUserId: input.actorUserId,
      action: 'SYSTEM_BACKUP_CREATED',
      targetType: 'RUNTIME_BACKUP',
      targetId: id,
      reason: input.reason,
      requestId: input.requestId,
      after: result,
      metadata: {
        sourceFileCount: manifestFiles.length,
        sourceBytes: totalBytes,
        invalidJsonFiles: manifestFiles.filter((file) => !file.parseOk).map((file) => file.path),
      },
    });

    if (pruned.length > 0) {
      await appendAdminAuditLog({
        actorUserId: input.actorUserId,
        action: 'SYSTEM_BACKUP_PRUNED',
        targetType: 'RUNTIME_BACKUP',
        requestId: input.requestId,
        metadata: { pruned, retention },
      });
    }

    return result;
  });
}

function pushIssue(
  issues: SystemIntegrityIssue[],
  input: Omit<SystemIntegrityIssue, 'id'>,
): void {
  if (issues.length >= MAX_REPORTED_ISSUES) return;

  issues.push({
    id: randomUUID(),
    ...input,
  });
}

function duplicateValueIssues(input: {
  issues: SystemIntegrityIssue[];
  records: JsonRecord[];
  file: string;
  field: string;
  label: string;
  normalize?: (value: string) => string;
}): void {
  const seen = new Map<string, string>();

  for (const record of input.records) {
    const recordId = textValue(record.id);
    const raw = textValue(record[input.field]);
    if (!raw) continue;
    const normalized = input.normalize ? input.normalize(raw) : raw;
    const previous = seen.get(normalized);

    if (previous) {
      pushIssue(input.issues, {
        severity: 'ERROR',
        category: 'DUPLICATE',
        file: input.file,
        recordId: recordId || undefined,
        message: `${input.label} bị trùng với bản ghi ${previous}: ${raw}`,
        recommendation: 'Kiểm tra thủ công và hợp nhất/xóa bản ghi trùng sau khi đã tạo backup.',
      });
    } else {
      seen.set(normalized, recordId || '(không có id)');
    }
  }
}

function idSet(records: JsonRecord[]): Set<string> {
  return new Set(records.map((record) => textValue(record.id)).filter(Boolean));
}

function addMissingRelationIssue(input: {
  issues: SystemIntegrityIssue[];
  exists: boolean;
  file: string;
  recordId?: string;
  field: string;
  value: string;
  target: string;
  severity?: SystemIssueSeverity;
}): void {
  if (input.exists || !input.value) return;

  pushIssue(input.issues, {
    severity: input.severity ?? 'ERROR',
    category: 'RELATION',
    file: input.file,
    recordId: input.recordId,
    message: `${input.field}=${input.value} không tham chiếu tới ${input.target} tồn tại.`,
    recommendation: 'Không tự xóa. Xác định bản ghi nguồn hoặc khôi phục bản ghi đích từ backup.',
  });
}

function safeStoredName(value: string): boolean {
  return Boolean(
    value &&
      path.basename(value) === value &&
      !value.includes('/') &&
      !value.includes('\\') &&
      /^[A-Za-z0-9._-]+$/.test(value),
  );
}

function runtimeMediaPath(value: string): string | null {
  if (!value) return null;

  let pathname: string;
  try {
    pathname = new URL(value, 'http://local.invalid').pathname;
  } catch {
    return null;
  }

  const match = pathname.match(/^\/api\/uploads\/(covers|gallery)\/([^/]+)$/);
  if (!match) return null;

  const folder = match[1];
  let storedName = '';

  try {
    storedName = decodeURIComponent(match[2] ?? '');
  } catch {
    return null;
  }

  if (!folder || !safeStoredName(storedName)) return null;
  return path.join(storageRoot, 'public-uploads', folder, storedName);
}

async function storageReferenceChecks(input: {
  issues: SystemIntegrityIssue[];
  json: Map<string, ParsedJsonFile>;
}): Promise<{ missing: number; orphan: number }> {
  const referenced = new Set<string>();
  let missing = 0;
  let orphan = 0;

  async function reference(inputReference: {
    absolutePath: string;
    file: string;
    recordId?: string;
    expectedBytes?: number;
    label: string;
  }): Promise<void> {
    const resolved = path.resolve(inputReference.absolutePath);
    referenced.add(canonicalFileSystemPath(resolved));

    try {
      const stats = await fs.stat(resolved);

      if (!stats.isFile()) throw new Error('Không phải file');

      if (
        inputReference.expectedBytes !== undefined &&
        inputReference.expectedBytes >= 0 &&
        stats.size !== inputReference.expectedBytes
      ) {
        pushIssue(input.issues, {
          severity: 'WARNING',
          category: 'STORAGE',
          file: inputReference.file,
          recordId: inputReference.recordId,
          message: `${inputReference.label} có dung lượng ${stats.size} byte, khác metadata ${inputReference.expectedBytes} byte.`,
          recommendation: 'So sánh file gốc và metadata trước khi sửa. Không thay file tự động.',
        });
      }
    } catch {
      missing += 1;
      pushIssue(input.issues, {
        severity: 'ERROR',
        category: 'STORAGE',
        file: inputReference.file,
        recordId: inputReference.recordId,
        message: `Thiếu ${inputReference.label}: ${path.relative(process.cwd(), resolved).replace(/\\/g, '/')}`,
        recommendation: 'Khôi phục file từ backup hoặc chuyển bản ghi sang nguồn tải ngoài hợp lệ.',
      });
    }
  }

  const mods = recordArray(input.json.get('mods.json')?.value);
  const versions = recordArray(input.json.get('mod-versions.json')?.value);
  const users = recordArray(input.json.get('users.json')?.value);
  const requests = recordArray(input.json.get('mod-requests.json')?.value);
  const modErrorReports = recordArray(input.json.get('mod-error-reports.json')?.value);

  for (const mod of mods) {
    const id = textValue(mod.id);
    const source = textValue(mod.downloadSource) || 'LOCAL';
    const storedName = textValue(mod.storedFileName);

    if (source !== 'EXTERNAL' && storedName) {
      if (!safeStoredName(storedName)) {
        pushIssue(input.issues, {
          severity: 'ERROR',
          category: 'STORAGE',
          file: 'mods.json',
          recordId: id || undefined,
          message: `storedFileName không an toàn: ${storedName}`,
          recommendation: 'Không truy cập đường dẫn này. Sửa metadata thủ công sau khi backup.',
        });
      } else {
        await reference({
          absolutePath: path.join(storageRoot, 'uploads', storedName),
          file: 'mods.json',
          recordId: id || undefined,
          expectedBytes: numericValue(mod.fileSize),
          label: 'file mod hiện tại',
        });
      }
    }

    for (const mediaValue of [textValue(mod.coverUrl), ...(Array.isArray(mod.galleryUrls) ? mod.galleryUrls.map(textValue) : [])]) {
      const filePath = runtimeMediaPath(mediaValue);
      if (filePath) {
        await reference({
          absolutePath: filePath,
          file: 'mods.json',
          recordId: id || undefined,
          label: 'ảnh mod',
        });
      }
    }
  }

  for (const version of versions) {
    const id = textValue(version.id);
    const source = textValue(version.downloadSource) || 'LOCAL';
    const storedName = textValue(version.storedFileName);

    if (source !== 'EXTERNAL' && storedName && safeStoredName(storedName)) {
      await reference({
        absolutePath: path.join(storageRoot, 'uploads', storedName),
        file: 'mod-versions.json',
        recordId: id || undefined,
        expectedBytes: numericValue(version.fileSize),
        label: 'file phiên bản',
      });
    }
  }

  for (const user of users) {
    const profile = isRecord(user.profile) ? user.profile : {};
    for (const mediaValue of [textValue(profile.avatar), textValue(profile.coverImage)]) {
      const filePath = runtimeMediaPath(mediaValue);
      if (filePath) {
        await reference({
          absolutePath: filePath,
          file: 'users.json',
          recordId: textValue(user.id) || undefined,
          label: 'ảnh hồ sơ',
        });
      }
    }
  }

  for (const request of requests) {
    const illustration = isRecord(request.illustration) ? request.illustration : null;
    const storedName = illustration ? textValue(illustration.storedName) : '';

    if (!storedName) continue;

    if (!safeStoredName(storedName)) {
      pushIssue(input.issues, {
        severity: 'ERROR',
        category: 'STORAGE',
        file: 'mod-requests.json',
        recordId: textValue(request.id) || undefined,
        message: `Tên ảnh minh họa không an toàn: ${storedName}`,
        recommendation: 'Sửa metadata thủ công sau khi tạo backup.',
      });
      continue;
    }

    await reference({
      absolutePath: path.join(storageRoot, 'mod-request-images', storedName),
      file: 'mod-requests.json',
      recordId: textValue(request.id) || undefined,
      expectedBytes: numericValue(illustration?.sizeBytes),
      label: 'ảnh minh họa yêu cầu mod',
    });
  }

  for (const report of modErrorReports) {
    const reportId = textValue(report.id);
    const images = Array.isArray(report.images)
      ? report.images.filter(isRecord)
      : [];

    for (const image of images) {
      const storedName = textValue(image.storedName);
      if (!storedName) continue;

      if (!safeStoredName(storedName)) {
        pushIssue(input.issues, {
          severity: 'ERROR',
          category: 'STORAGE',
          file: 'mod-error-reports.json',
          recordId: reportId || undefined,
          message: `Tên ảnh báo lỗi không an toàn: ${storedName}`,
          recommendation: 'Sửa metadata thủ công sau khi tạo backup.',
        });
        continue;
      }

      await reference({
        absolutePath: path.join(storageRoot, 'mod-error-report-images', storedName),
        file: 'mod-error-reports.json',
        recordId: reportId || undefined,
        expectedBytes: numericValue(image.sizeBytes),
        label: 'ảnh báo cáo lỗi mod',
      });
    }
  }

  const walked = await walkDirectory(storageRoot);
  const orphanRoots = [
    path.join(storageRoot, 'uploads'),
    path.join(storageRoot, 'public-uploads'),
    path.join(storageRoot, 'mod-request-images'),
    path.join(storageRoot, 'mod-error-report-images'),
  ].map(canonicalFileSystemPath);

  for (const file of walked.files) {
    const resolved = path.resolve(file.absolutePath);
    const resolvedKey = canonicalFileSystemPath(resolved);
    const belongsToManagedRoot = orphanRoots.some(
      (root) => resolvedKey === root || resolvedKey.startsWith(`${root}${path.sep}`),
    );

    if (!belongsToManagedRoot || referenced.has(resolvedKey)) continue;

    const currentFile = await confirmCurrentStorageFile(resolved);

    // The file may have been moved to quarantine after walkDirectory() listed
    // it. Do not persist a warning unless it still exists at issue time.
    if (!currentFile) continue;

    const settledFile = await settleOrphanCandidate(currentFile);

    if (!settledFile) continue;

    const relativePath = path
      .relative(storageRoot, settledFile.absolutePath)
      .replace(/\\/g, '/');

    orphan += 1;
    pushIssue(input.issues, {
      severity: 'WARNING',
      category: 'STORAGE',
      file: relativePath,
      message: `File chưa tìm thấy bản ghi tham chiếu (${settledFile.bytes} byte).`,
      recommendation: 'Xem trước thủ công. Không xóa trước khi kiểm tra mods.json, mod-versions.json và dữ liệu hồ sơ.',
    });
  }

  return { missing, orphan };
}

async function uploadSessionIssues(issues: SystemIntegrityIssue[]): Promise<void> {
  const root = path.join(storageRoot, 'upload-sessions');
  const entries = await fs.readdir(root, { withFileTypes: true }).catch(() => []);

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const recordId = entry.name;
    const directory = path.join(root, entry.name);

    try {
      const [raw, payloadStats] = await Promise.all([
        fs.readFile(path.join(directory, 'manifest.json'), 'utf8'),
        fs.stat(path.join(directory, 'payload.part')),
      ]);
      const manifest = JSON.parse(raw) as JsonRecord;
      const totalBytes = numericValue(manifest.totalBytes);
      const receivedBytes = numericValue(manifest.receivedBytes);
      const updatedAt = Date.parse(textValue(manifest.updatedAt));

      if (
        totalBytes === undefined ||
        receivedBytes === undefined ||
        !Number.isFinite(updatedAt)
      ) {
        throw new Error('Manifest thiếu trường bắt buộc.');
      }

      if (payloadStats.size !== receivedBytes) {
        pushIssue(issues, {
          severity: 'ERROR',
          category: 'UPLOAD_SESSION',
          file: `storage/upload-sessions/${entry.name}/manifest.json`,
          recordId,
          message: `Payload ${payloadStats.size} byte không khớp receivedBytes=${receivedBytes}.`,
          recommendation: 'Không tiếp tục phiên. Xác minh và để cleanup dọn sau khi đã kiểm tra.',
        });
      }

      if (Date.now() - updatedAt >= 24 * 60 * 60 * 1_000) {
        pushIssue(issues, {
          severity: 'WARNING',
          category: 'UPLOAD_SESSION',
          file: `storage/upload-sessions/${entry.name}`,
          recordId,
          message: 'Phiên upload đã không cập nhật quá 24 giờ.',
          recommendation: 'Có thể dọn bằng quy trình preview/confirm ở Phase repair; hiện tại chưa tự xóa.',
        });
      }
    } catch (error) {
      pushIssue(issues, {
        severity: 'ERROR',
        category: 'UPLOAD_SESSION',
        file: `storage/upload-sessions/${entry.name}`,
        recordId,
        message: `Phiên upload không đọc được: ${formatError(error).slice(0, 300)}`,
        recommendation: 'Không xóa tự động. Kiểm tra lock và file tạm trước khi dọn.',
      });
    }
  }
}

function relationChecks(json: Map<string, ParsedJsonFile>, issues: SystemIntegrityIssue[]): number {
  const users = recordArray(json.get('users.json')?.value);
  const mods = recordArray(json.get('mods.json')?.value);
  const versions = recordArray(json.get('mod-versions.json')?.value);
  const comments = recordArray(json.get('comments.json')?.value);
  const reviews = recordArray(json.get('reviews.json')?.value);
  const favorites = recordArray(json.get('mod-favorites.json')?.value);
  const collections = recordArray(json.get('collections.json')?.value);
  const collectionItems = recordArray(json.get('collection-items.json')?.value);
  const collectionFollowers = recordArray(json.get('collection-followers.json')?.value);
  const follows = recordArray(json.get('follows.json')?.value);
  const notifications = recordArray(json.get('notifications.json')?.value);
  const requests = recordArray(json.get('mod-requests.json')?.value);
  const requestVotes = recordArray(json.get('mod-request-votes.json')?.value);
  const modErrorReports = recordArray(json.get('mod-error-reports.json')?.value);
  const reputationLogs = recordArray(json.get('reputation-logs.json')?.value);
  const cultivationLogs = recordArray(json.get('cultivation-logs.json')?.value);
  const announcements = recordArray(json.get('achievement-announcements.json')?.value);
  const donationTokens = recordArray(json.get('donation-tokens.json')?.value);
  const donationTransactions = recordArray(json.get('donation-transactions.json')?.value);

  const userIds = idSet(users);
  const modIds = idSet(mods);
  const versionIds = idSet(versions);
  const commentIds = idSet(comments);
  const collectionIds = idSet(collections);
  const requestIds = idSet(requests);

  for (const [file, records] of [
    ['users.json', users],
    ['mods.json', mods],
    ['mod-versions.json', versions],
    ['comments.json', comments],
    ['reviews.json', reviews],
    ['collections.json', collections],
    ['notifications.json', notifications],
    ['mod-requests.json', requests],
    ['mod-error-reports.json', modErrorReports],
    ['reputation-logs.json', reputationLogs],
    ['cultivation-logs.json', cultivationLogs],
    ['achievement-announcements.json', announcements],
    ['donation-tokens.json', donationTokens],
    ['donation-transactions.json', donationTransactions],
  ] as const) {
    duplicateValueIssues({ issues, records, file, field: 'id', label: 'ID' });
  }

  duplicateValueIssues({
    issues,
    records: users,
    file: 'users.json',
    field: 'email',
    label: 'Email',
    normalize: (value) => value.toLowerCase(),
  });
  duplicateValueIssues({
    issues,
    records: users,
    file: 'users.json',
    field: 'profileSlug',
    label: 'Profile slug',
    normalize: (value) => value.toLowerCase(),
  });
  duplicateValueIssues({
    issues,
    records: mods,
    file: 'mods.json',
    field: 'slug',
    label: 'Mod slug',
    normalize: (value) => value.toLowerCase(),
  });

  for (const mod of mods) {
    const id = textValue(mod.id);
    const authorId = textValue(mod.authorId);
    addMissingRelationIssue({
      issues,
      exists: !authorId || userIds.has(authorId),
      file: 'mods.json',
      recordId: id || undefined,
      field: 'authorId',
      value: authorId,
      target: 'users.json',
      severity: 'WARNING',
    });

    const source = textValue(mod.downloadSource) || 'LOCAL';
    if (source === 'EXTERNAL' && !textValue(mod.externalDownloadUrl).startsWith('https://')) {
      pushIssue(issues, {
        severity: 'ERROR',
        category: 'RELATION',
        file: 'mods.json',
        recordId: id || undefined,
        message: 'Mod dùng nguồn EXTERNAL nhưng thiếu HTTPS URL hợp lệ.',
        recommendation: 'Cập nhật link tải ngoài hoặc chuyển lại nguồn LOCAL sau khi xác minh file.',
      });
    }
  }

  const currentVersionsByMod = new Map<string, JsonRecord[]>();

  for (const version of versions) {
    const id = textValue(version.id);
    const modId = textValue(version.modId);
    const creatorId = textValue(version.createdByUserId);

    addMissingRelationIssue({
      issues,
      exists: modIds.has(modId),
      file: 'mod-versions.json',
      recordId: id || undefined,
      field: 'modId',
      value: modId,
      target: 'mods.json',
    });
    addMissingRelationIssue({
      issues,
      exists: !creatorId || userIds.has(creatorId),
      file: 'mod-versions.json',
      recordId: id || undefined,
      field: 'createdByUserId',
      value: creatorId,
      target: 'users.json',
      severity: 'WARNING',
    });

    if (version.isCurrent === true && modId) {
      const list = currentVersionsByMod.get(modId) ?? [];
      list.push(version);
      currentVersionsByMod.set(modId, list);
    }
  }

  for (const mod of mods) {
    const modId = textValue(mod.id);
    const modVersions = versions.filter((version) => textValue(version.modId) === modId);
    const current = currentVersionsByMod.get(modId) ?? [];

    if (modVersions.length > 0 && current.length === 0) {
      pushIssue(issues, {
        severity: 'WARNING',
        category: 'RELATION',
        file: 'mod-versions.json',
        recordId: modId || undefined,
        message: 'Mod có lịch sử phiên bản nhưng không có phiên bản isCurrent.',
        recommendation: 'Đối chiếu mods.json và chọn đúng một phiên bản hiện tại.',
      });
    }

    if (current.length > 1) {
      pushIssue(issues, {
        severity: 'ERROR',
        category: 'RELATION',
        file: 'mod-versions.json',
        recordId: modId || undefined,
        message: `Mod có ${current.length} phiên bản cùng được đánh dấu isCurrent.`,
        recommendation: 'Giữ đúng một phiên bản hiện tại sau khi tạo backup.',
      });
    }
  }

  for (const comment of comments) {
    const id = textValue(comment.id);
    const modId = textValue(comment.modId);
    const userId = textValue(comment.userId);
    const parentId = textValue(comment.parentId);
    addMissingRelationIssue({ issues, exists: modIds.has(modId), file: 'comments.json', recordId: id || undefined, field: 'modId', value: modId, target: 'mods.json' });
    addMissingRelationIssue({ issues, exists: userIds.has(userId), file: 'comments.json', recordId: id || undefined, field: 'userId', value: userId, target: 'users.json', severity: 'WARNING' });
    addMissingRelationIssue({ issues, exists: !parentId || commentIds.has(parentId), file: 'comments.json', recordId: id || undefined, field: 'parentId', value: parentId, target: 'comments.json' });
  }

  for (const review of reviews) {
    const id = textValue(review.id);
    const modId = textValue(review.modId);
    const userId = textValue(review.userId);
    addMissingRelationIssue({ issues, exists: modIds.has(modId), file: 'reviews.json', recordId: id || undefined, field: 'modId', value: modId, target: 'mods.json' });
    addMissingRelationIssue({ issues, exists: userIds.has(userId), file: 'reviews.json', recordId: id || undefined, field: 'userId', value: userId, target: 'users.json', severity: 'WARNING' });
  }

  const pairDuplicateCheck = (
    records: JsonRecord[],
    file: string,
    fields: string[],
    label: string,
  ) => {
    const seen = new Set<string>();
    for (const record of records) {
      const key = fields.map((field) => textValue(record[field])).join('::');
      if (!key.replace(/:/g, '')) continue;
      if (seen.has(key)) {
        pushIssue(issues, {
          severity: 'WARNING',
          category: 'DUPLICATE',
          file,
          recordId: textValue(record.id) || undefined,
          message: `${label} bị trùng: ${key}`,
          recommendation: 'Kiểm tra và chỉ giữ một bản ghi sau khi backup.',
        });
      } else {
        seen.add(key);
      }
    }
  };

  pairDuplicateCheck(favorites, 'mod-favorites.json', ['userId', 'modId'], 'Yêu thích');
  pairDuplicateCheck(collectionItems, 'collection-items.json', ['collectionId', 'modId'], 'Mod trong bộ sưu tập');
  pairDuplicateCheck(collectionFollowers, 'collection-followers.json', ['collectionId', 'userId'], 'Theo dõi bộ sưu tập');
  pairDuplicateCheck(follows, 'follows.json', ['followerId', 'followingId'], 'Theo dõi user');
  pairDuplicateCheck(requestVotes, 'mod-request-votes.json', ['requestId', 'userId'], 'Bình chọn yêu cầu');

  for (const favorite of favorites) {
    addMissingRelationIssue({ issues, exists: userIds.has(textValue(favorite.userId)), file: 'mod-favorites.json', field: 'userId', value: textValue(favorite.userId), target: 'users.json', severity: 'WARNING' });
    addMissingRelationIssue({ issues, exists: modIds.has(textValue(favorite.modId)), file: 'mod-favorites.json', field: 'modId', value: textValue(favorite.modId), target: 'mods.json' });
  }

  for (const collection of collections) {
    addMissingRelationIssue({ issues, exists: userIds.has(textValue(collection.ownerId)), file: 'collections.json', recordId: textValue(collection.id) || undefined, field: 'ownerId', value: textValue(collection.ownerId), target: 'users.json', severity: 'WARNING' });
  }

  for (const item of collectionItems) {
    addMissingRelationIssue({ issues, exists: collectionIds.has(textValue(item.collectionId)), file: 'collection-items.json', field: 'collectionId', value: textValue(item.collectionId), target: 'collections.json' });
    addMissingRelationIssue({ issues, exists: modIds.has(textValue(item.modId)), file: 'collection-items.json', field: 'modId', value: textValue(item.modId), target: 'mods.json' });
    addMissingRelationIssue({ issues, exists: userIds.has(textValue(item.addedByUserId)), file: 'collection-items.json', field: 'addedByUserId', value: textValue(item.addedByUserId), target: 'users.json', severity: 'WARNING' });
  }

  for (const item of collectionFollowers) {
    addMissingRelationIssue({ issues, exists: collectionIds.has(textValue(item.collectionId)), file: 'collection-followers.json', recordId: textValue(item.id) || undefined, field: 'collectionId', value: textValue(item.collectionId), target: 'collections.json' });
    addMissingRelationIssue({ issues, exists: userIds.has(textValue(item.userId)), file: 'collection-followers.json', recordId: textValue(item.id) || undefined, field: 'userId', value: textValue(item.userId), target: 'users.json', severity: 'WARNING' });
  }

  for (const follow of follows) {
    const id = textValue(follow.id);
    const followerId = textValue(follow.followerId);
    const followingId = textValue(follow.followingId);
    addMissingRelationIssue({ issues, exists: userIds.has(followerId), file: 'follows.json', recordId: id || undefined, field: 'followerId', value: followerId, target: 'users.json', severity: 'WARNING' });
    addMissingRelationIssue({ issues, exists: userIds.has(followingId), file: 'follows.json', recordId: id || undefined, field: 'followingId', value: followingId, target: 'users.json', severity: 'WARNING' });
    if (followerId && followerId === followingId) {
      pushIssue(issues, { severity: 'WARNING', category: 'RELATION', file: 'follows.json', recordId: id || undefined, message: 'Bản ghi theo dõi chính tài khoản đó.', recommendation: 'Xác minh và xóa bản ghi self-follow sau khi backup.' });
    }
  }

  for (const notification of notifications) {
    const id = textValue(notification.id);
    addMissingRelationIssue({ issues, exists: userIds.has(textValue(notification.userId)), file: 'notifications.json', recordId: id || undefined, field: 'userId', value: textValue(notification.userId), target: 'users.json', severity: 'WARNING' });
    const actorId = textValue(notification.actorUserId);
    addMissingRelationIssue({ issues, exists: !actorId || userIds.has(actorId), file: 'notifications.json', recordId: id || undefined, field: 'actorUserId', value: actorId, target: 'users.json', severity: 'INFO' });
    const relatedModId = textValue(notification.relatedModId);
    addMissingRelationIssue({ issues, exists: !relatedModId || modIds.has(relatedModId), file: 'notifications.json', recordId: id || undefined, field: 'relatedModId', value: relatedModId, target: 'mods.json', severity: 'INFO' });
  }

  for (const request of requests) {
    addMissingRelationIssue({ issues, exists: userIds.has(textValue(request.userId)), file: 'mod-requests.json', recordId: textValue(request.id) || undefined, field: 'userId', value: textValue(request.userId), target: 'users.json', severity: 'WARNING' });
  }

  for (const vote of requestVotes) {
    addMissingRelationIssue({ issues, exists: requestIds.has(textValue(vote.requestId)), file: 'mod-request-votes.json', field: 'requestId', value: textValue(vote.requestId), target: 'mod-requests.json' });
    addMissingRelationIssue({ issues, exists: userIds.has(textValue(vote.userId)), file: 'mod-request-votes.json', field: 'userId', value: textValue(vote.userId), target: 'users.json', severity: 'WARNING' });
  }

  for (const report of modErrorReports) {
    const reportId = textValue(report.id);
    addMissingRelationIssue({ issues, exists: modIds.has(textValue(report.modId)), file: 'mod-error-reports.json', recordId: reportId || undefined, field: 'modId', value: textValue(report.modId), target: 'mods.json' });
    addMissingRelationIssue({ issues, exists: userIds.has(textValue(report.reporterUserId)), file: 'mod-error-reports.json', recordId: reportId || undefined, field: 'reporterUserId', value: textValue(report.reporterUserId), target: 'users.json', severity: 'WARNING' });
  }

  const ledgerCheck = (
    records: JsonRecord[],
    file: string,
    storedValue: (user: JsonRecord) => number | undefined,
    label: string,
  ) => {
    const activeKeys = new Set<string>();
    const totals = new Map<string, number>();

    for (const record of records) {
      const id = textValue(record.id);
      const userId = textValue(record.userId);
      const points = numericValue(record.points);
      addMissingRelationIssue({ issues, exists: userIds.has(userId), file, recordId: id || undefined, field: 'userId', value: userId, target: 'users.json', severity: 'WARNING' });

      if (points === undefined) {
        pushIssue(issues, { severity: 'ERROR', category: 'LEDGER', file, recordId: id || undefined, message: `${label} có points không hợp lệ.`, recommendation: 'Đối chiếu bản ghi nguồn trước khi sửa ledger.' });
        continue;
      }

      totals.set(userId, (totals.get(userId) ?? 0) + points);
      const uniqueKey = textValue(record.uniqueKey);
      if (uniqueKey && !textValue(record.reversedAt)) {
        const key = `${userId}::${uniqueKey}`;
        if (activeKeys.has(key)) {
          pushIssue(issues, { severity: 'ERROR', category: 'DUPLICATE', file, recordId: id || undefined, message: `${label} trùng uniqueKey đang hoạt động: ${uniqueKey}`, recommendation: 'Không cộng/xóa tự động. Xác định grant hợp lệ và reversal liên quan.' });
        } else {
          activeKeys.add(key);
        }
      }
    }

    for (const user of users) {
      const userId = textValue(user.id);
      if (!totals.has(userId)) continue;
      const ledgerTotal = Math.max(0, Math.round(totals.get(userId) ?? 0));
      const stored = storedValue(user);
      if (stored !== undefined && Math.max(0, Math.round(stored)) !== ledgerTotal) {
        pushIssue(issues, { severity: 'ERROR', category: 'LEDGER', file: 'users.json', recordId: userId || undefined, message: `${label} lưu=${Math.max(0, Math.round(stored))}, ledger=${ledgerTotal}.`, recommendation: `Dùng công cụ rebuild ${label} hiện có sau khi tạo backup và xem lại log.` });
      }
    }
  };

  ledgerCheck(
    reputationLogs,
    'reputation-logs.json',
    (user) => isRecord(user.reputation) ? numericValue(user.reputation.totalPoints) : undefined,
    'Danh vọng',
  );
  ledgerCheck(
    cultivationLogs,
    'cultivation-logs.json',
    (user) => isRecord(user.cultivation) ? numericValue(user.cultivation.totalXp) : undefined,
    'Tu vi',
  );

  const announcementKeys = new Set<string>();
  for (const announcement of announcements) {
    const id = textValue(announcement.id);
    const userId = textValue(announcement.userId);
    const uniqueKey = textValue(announcement.uniqueKey);
    addMissingRelationIssue({ issues, exists: userIds.has(userId), file: 'achievement-announcements.json', recordId: id || undefined, field: 'userId', value: userId, target: 'users.json', severity: 'WARNING' });
    const key = `${userId}::${uniqueKey}`;
    if (uniqueKey && announcementKeys.has(key)) {
      pushIssue(issues, { severity: 'WARNING', category: 'DUPLICATE', file: 'achievement-announcements.json', recordId: id || undefined, message: `Popup trùng uniqueKey: ${uniqueKey}`, recommendation: 'Xác minh trước khi loại bỏ popup trùng.' });
    }
    if (uniqueKey) announcementKeys.add(key);
  }

  duplicateValueIssues({ issues, records: donationTokens, file: 'donation-tokens.json', field: 'userId', label: 'Donation userId' });
  duplicateValueIssues({ issues, records: donationTokens, file: 'donation-tokens.json', field: 'normalizedToken', label: 'Donation token' });
  duplicateValueIssues({ issues, records: donationTokens, file: 'donation-tokens.json', field: 'sepayCode', label: 'Mã thanh toán SePay' });
  for (const token of donationTokens) {
    const sepayCode = textValue(token.sepayCode);
    addMissingRelationIssue({ issues, exists: userIds.has(textValue(token.userId)), file: 'donation-tokens.json', recordId: textValue(token.id) || undefined, field: 'userId', value: textValue(token.userId), target: 'users.json', severity: 'WARNING' });

    if (sepayCode && !/^[A-Z]{2,5}[A-Z0-9]{10}$/.test(sepayCode)) {
      pushIssue(issues, {
        severity: 'WARNING',
        category: 'RELATION',
        file: 'donation-tokens.json',
        recordId: textValue(token.id) || undefined,
        message: `Mã thanh toán SePay không đúng cấu trúc: ${sepayCode}`,
        recommendation: 'Mở trang /support bằng đúng tài khoản để hệ thống tạo lại mã SePay hợp lệ; không xóa token cũ.',
      });
    }
  }

  duplicateValueIssues({ issues, records: donationTransactions, file: 'donation-transactions.json', field: 'uniqueKey', label: 'Donation uniqueKey' });
  for (const transaction of donationTransactions) {
    const userId = textValue(transaction.userId);
    addMissingRelationIssue({ issues, exists: !userId || userIds.has(userId), file: 'donation-transactions.json', recordId: textValue(transaction.id) || undefined, field: 'userId', value: userId, target: 'users.json', severity: 'WARNING' });
  }

  return [
    users,
    mods,
    versions,
    comments,
    reviews,
    favorites,
    collections,
    collectionItems,
    collectionFollowers,
    follows,
    notifications,
    requests,
    requestVotes,
    reputationLogs,
    cultivationLogs,
    announcements,
    donationTokens,
    donationTransactions,
  ].reduce((sum, records) => sum + records.length, 0);
}

async function saveIntegrityReport(report: SystemIntegrityReport): Promise<void> {
  const reports = await readJsonAtomic<SystemIntegrityReport[]>(integrityReportsPath, []);
  reports.push(report);
  await writeJsonAtomic(integrityReportsPath, reports.slice(-20));
}

export async function getIntegrityReports(): Promise<SystemIntegrityReport[]> {
  return readJsonAtomic<SystemIntegrityReport[]>(integrityReportsPath, []);
}

export async function getLatestIntegrityReport(): Promise<SystemIntegrityReport | null> {
  const reports = await getIntegrityReports();
  return reports.slice().sort((left, right) => right.createdAt.localeCompare(left.createdAt))[0] ?? null;
}

export async function runSystemIntegrityScan(input: {
  actorUserId: string;
  requestId?: string;
}): Promise<SystemIntegrityReport> {
  return withGlobalLock('__modLibraryIntegrityMutation', async () => {
    const startedAt = Date.now();
    const issues: SystemIntegrityIssue[] = [];
    const json = await readJsonInventory();

    for (const required of CORE_JSON_FILES) {
      if (!json.has(required)) {
        pushIssue(issues, {
          severity: 'CRITICAL',
          category: 'JSON',
          file: required,
          message: `Thiếu file runtime bắt buộc ${required}.`,
          recommendation: 'Khôi phục từ backup gần nhất trước khi tiếp tục thao tác ghi.',
        });
      }
    }

    for (const [fileName, item] of json) {
      if (!item.health.parseOk) {
        pushIssue(issues, {
          severity: 'CRITICAL',
          category: 'JSON',
          file: fileName,
          message: `JSON không parse được: ${item.health.error ?? 'Lỗi không xác định'}`,
          recommendation: 'Chuyển hệ thống sang read-only và khôi phục file từ backup hợp lệ.',
        });
        continue;
      }

      if (item.health.topLevelType === 'primitive') {
        pushIssue(issues, {
          severity: 'ERROR',
          category: 'JSON',
          file: fileName,
          message: 'JSON cấp cao nhất là primitive, không phải array/object.',
          recommendation: 'Đối chiếu schema của repository trước khi sửa.',
        });
      }
    }

    const recordsScanned = relationChecks(json, issues);
    const storage = await storageReferenceChecks({ issues, json });
    await uploadSessionIssues(issues);

    const counts = {
      critical: issues.filter((issue) => issue.severity === 'CRITICAL').length,
      errors: issues.filter((issue) => issue.severity === 'ERROR').length,
      warnings: issues.filter((issue) => issue.severity === 'WARNING').length,
      info: issues.filter((issue) => issue.severity === 'INFO').length,
    };

    const report: SystemIntegrityReport = {
      id: randomUUID(),
      createdAt: new Date().toISOString(),
      createdByUserId: input.actorUserId,
      durationMs: Date.now() - startedAt,
      truncated: issues.length >= MAX_REPORTED_ISSUES,
      runtime: runtimeContext(),
      summary: {
        filesScanned: json.size,
        recordsScanned,
        ...counts,
        missingStorageFiles: storage.missing,
        orphanStorageFiles: storage.orphan,
      },
      issues,
    };

    await saveIntegrityReport(report);
    await appendAdminAuditLog({
      actorUserId: input.actorUserId,
      action: 'SYSTEM_INTEGRITY_SCAN',
      targetType: 'SYSTEM_INTEGRITY_REPORT',
      targetId: report.id,
      requestId: input.requestId,
      after: report.summary,
      metadata: {
        durationMs: report.durationMs,
        truncated: report.truncated,
        runtime: report.runtime,
      },
    });

    return report;
  });
}

async function readApplicationVersion(): Promise<string> {
  try {
    const raw = await fs.readFile(path.join(process.cwd(), 'package.json'), 'utf8');
    const parsed = JSON.parse(raw) as JsonRecord;
    return textValue(parsed.version) || 'unknown';
  } catch {
    return 'unknown';
  }
}

async function diskStatus(): Promise<SystemOverview['disk']> {
  try {
    const stats = await fs.statfs(process.cwd());
    const totalBytes = Number(stats.blocks) * Number(stats.bsize);
    const freeBytes = Number(stats.bavail) * Number(stats.bsize);

    return {
      totalBytes,
      freeBytes,
      freePercent: totalBytes > 0 ? (freeBytes / totalBytes) * 100 : undefined,
    };
  } catch (error) {
    return { error: formatError(error).slice(0, 300) };
  }
}

export async function getSystemOverview(): Promise<SystemOverview> {
  const backupsPath = (() => {
    try {
      return backupDirectory();
    } catch {
      return path.join(path.dirname(process.cwd()), 'invalid-runtime-backups');
    }
  })();

  const [dataStatus, storageStatus, backupStatus, json, storage, backups, latestIntegrityReport, auditLogs, disk, version] = await Promise.all([
    accessStatus(dataDir),
    accessStatus(storageRoot),
    fs.mkdir(backupsPath, { recursive: true }).then(() => accessStatus(backupsPath)).catch(() => ({ exists: false, readable: false, writable: false })),
    readJsonInventory(),
    getStorageInventory(),
    listRuntimeBackups(),
    getLatestIntegrityReport(),
    getRecentAdminAuditLogs(100),
    diskStatus(),
    readApplicationVersion(),
  ]);

  const jsonFiles = [...json.values()].map((item) => item.health).sort((left, right) => left.name.localeCompare(right.name));
  const lowDisk =
    disk.freeBytes !== undefined &&
    disk.totalBytes !== undefined &&
    (disk.freeBytes < 5 * 1024 * 1024 * 1024 || (disk.freeBytes / disk.totalBytes) * 100 < 5);
  const degraded =
    !dataStatus.exists ||
    !dataStatus.readable ||
    !dataStatus.writable ||
    !storageStatus.exists ||
    !storageStatus.readable ||
    !storageStatus.writable ||
    !backupStatus.writable ||
    jsonFiles.some((file) => !file.parseOk) ||
    lowDisk;

  return {
    generatedAt: new Date().toISOString(),
    status: degraded ? 'degraded' : 'ok',
    runtime: runtimeContext(),
    application: {
      version,
      nodeEnv: process.env.NODE_ENV ?? 'unknown',
      uptimeSeconds: Math.floor(process.uptime()),
    },
    disk,
    directories: {
      data: dataStatus,
      storage: storageStatus,
      backups: backupStatus,
    },
    jsonFiles,
    storage,
    backups,
    latestIntegrityReport,
    auditLogs,
  };
}
