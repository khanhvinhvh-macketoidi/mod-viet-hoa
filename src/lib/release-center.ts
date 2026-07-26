import 'server-only';

import { execFile } from 'node:child_process';
import type { Dirent } from 'node:fs';
import { createHmac, randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';
import { appendAdminAuditLog } from '@/lib/admin-audit';
import { isSepayAutomationEnabled } from '@/config/features';
import { dataDir } from '@/lib/data-paths';
import { getSupportAccountConfig } from '@/lib/donations';
import { PUBLIC_SITE_URL } from '@/lib/public/site-public-info';
import {
  parseRichText,
  richTextToPlainText,
  safeRichTextColor,
  safeRichTextSize,
} from '@/lib/rich-text';
import { readJsonAtomic, writeJsonAtomic } from '@/lib/stability/atomic-json';
import {
  listRuntimeBackups,
  runSystemIntegrityScan,
  type SystemIntegrityReport,
} from '@/lib/system-operations';
import { MAX_IMAGE_FILE_BYTES, MEBIBYTE } from '@/lib/upload-limits';

export type ReleaseCheckMode = 'QUICK' | 'RELEASE';
export type ReleaseCheckStatus = 'PASS' | 'WARNING' | 'FAIL';
export type ReleaseCheckVerdict = 'READY' | 'REVIEW' | 'BLOCKED';
export type ReleaseCheckCategory =
  | 'RUNTIME'
  | 'NETWORK'
  | 'STORAGE'
  | 'JSON'
  | 'BUILD'
  | 'SECURITY'
  | 'FEATURE'
  | 'BACKUP'
  | 'INTEGRITY';

export type ReleaseCheckItem = {
  id: string;
  key: string;
  category: ReleaseCheckCategory;
  status: ReleaseCheckStatus;
  title: string;
  detail: string;
  recommendation?: string;
  durationMs: number;
  metadata?: Record<string, unknown>;
};

export type ReleaseCheckReport = {
  id: string;
  mode: ReleaseCheckMode;
  createdAt: string;
  createdByUserId: string;
  reason?: string;
  durationMs: number;
  verdict: ReleaseCheckVerdict;
  summary: {
    passed: number;
    warnings: number;
    failed: number;
    total: number;
  };
  runtime: {
    processId: number;
    projectRoot: string;
    nodeVersion: string;
    nodeEnv: string;
    applicationVersion: string;
  };
  checks: ReleaseCheckItem[];
  integrityReportId?: string;
};

export type ReleaseCenterOverview = {
  generatedAt: string;
  latestReport: ReleaseCheckReport | null;
  latestQuickReport: ReleaseCheckReport | null;
  latestReleaseReport: ReleaseCheckReport | null;
  reports: ReleaseCheckReport[];
};

type CheckOutcome = {
  status: ReleaseCheckStatus;
  detail: string;
  recommendation?: string;
  metadata?: Record<string, unknown>;
};

type CheckDefinition = {
  key: string;
  category: ReleaseCheckCategory;
  title: string;
  timeoutMs?: number;
  run: () => Promise<CheckOutcome>;
};

type JsonRecord = Record<string, unknown>;

const execFileAsync = promisify(execFile);
const projectRoot = path.resolve(process.cwd());
const storageRoot = path.join(projectRoot, 'storage');
const reportsPath = path.join(dataDir, 'release-check-reports.json');
const REPORT_RETENTION = 100;
const QUICK_CHECK_TIMEOUT_MS = 10_000;
const RELEASE_CHECK_TIMEOUT_MS = 60_000;
const BUILD_STALE_TOLERANCE_MS = 3_000;
const CRITICAL_ROUTE_KEYS = [
  '/admin/release-center/page',
  '/admin/system/page',
  '/api/admin/release-center/run/route',
  '/api/admin/release-center/reports/[id]/route',
  '/api/health/route',
  '/api/mods/route',
  '/api/comments/create/route',
  '/api/reviews/upsert/route',
  '/api/mod-error-reports/route',
  '/api/community-media/route',
  '/api/webhooks/sepay/route',
] as const;

const globalState = globalThis as typeof globalThis & {
  __modLibraryReleaseCheckMutation?: Promise<void>;
};

function withReleaseCheckLock<T>(operation: () => Promise<T>): Promise<T> {
  const previous =
    globalState.__modLibraryReleaseCheckMutation ?? Promise.resolve();

  let release!: () => void;
  const current = new Promise<void>((resolve) => {
    release = resolve;
  });

  globalState.__modLibraryReleaseCheckMutation = previous.then(() => current);

  return previous.then(async () => {
    try {
      return await operation();
    } finally {
      release();
    }
  });
}

function formatError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function cleanReason(value: unknown): string | undefined {
  const reason = String(value ?? '')
    .normalize('NFKC')
    .replace(/\u0000/g, '')
    .trim()
    .slice(0, 500);

  return reason || undefined;
}

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  label: string,
): Promise<T> {
  let timeout: NodeJS.Timeout | undefined;

  const timeoutPromise = new Promise<never>((_resolve, reject) => {
    timeout = setTimeout(() => {
      reject(new Error(`${label} quá thời gian ${timeoutMs}ms.`));
    }, timeoutMs);
  });

  return Promise.race([promise, timeoutPromise]).finally(() => {
    if (timeout) clearTimeout(timeout);
  });
}

async function executeCheck(
  definition: CheckDefinition,
): Promise<ReleaseCheckItem> {
  const startedAt = Date.now();

  try {
    const outcome = await withTimeout(
      definition.run(),
      definition.timeoutMs ?? QUICK_CHECK_TIMEOUT_MS,
      definition.title,
    );

    return {
      id: randomUUID(),
      key: definition.key,
      category: definition.category,
      title: definition.title,
      durationMs: Date.now() - startedAt,
      ...outcome,
    };
  } catch (error) {
    return {
      id: randomUUID(),
      key: definition.key,
      category: definition.category,
      status: 'FAIL',
      title: definition.title,
      detail: formatError(error).slice(0, 1_000),
      recommendation:
        'Xem log PM2 và xử lý nguyên nhân trước khi phát hành.',
      durationMs: Date.now() - startedAt,
    };
  }
}

async function applicationVersion(): Promise<string> {
  try {
    const raw = await fs.readFile(path.join(projectRoot, 'package.json'), 'utf8');
    const parsed = JSON.parse(raw) as { version?: unknown };
    return String(parsed.version ?? 'unknown');
  } catch {
    return 'unknown';
  }
}

async function fetchJson(
  url: string,
  init: RequestInit = {},
  timeoutMs = 6_000,
): Promise<{
  status: number;
  ok: boolean;
  body: unknown;
  contentType: string;
}> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...init,
      cache: 'no-store',
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        ...(init.headers ?? {}),
      },
    });
    const contentType = response.headers.get('content-type') ?? '';
    const text = await response.text();
    let body: unknown = text;

    if (contentType.includes('application/json') && text.trim()) {
      try {
        body = JSON.parse(text) as unknown;
      } catch {
        body = text;
      }
    }

    return {
      status: response.status,
      ok: response.ok,
      body,
      contentType,
    };
  } finally {
    clearTimeout(timeout);
  }
}

function localBaseUrl(): string {
  const parsedPort = Number(process.env.PORT ?? 3000);
  const port = Number.isInteger(parsedPort) && parsedPort > 0
    ? parsedPort
    : 3000;

  return `http://127.0.0.1:${port}`;
}

async function healthCheck(url: string, label: string): Promise<CheckOutcome> {
  const result = await fetchJson(url, {}, 7_000);
  const body = isRecord(result.body) ? result.body : {};
  const healthStatus = String(body.status ?? 'unknown');
  const healthy = result.status === 200 && healthStatus === 'ok';

  return {
    status: healthy ? 'PASS' : 'FAIL',
    detail: healthy
      ? `${label} trả HTTP 200 và trạng thái ok.`
      : `${label} trả HTTP ${result.status}, trạng thái ${healthStatus}.`,
    recommendation: healthy
      ? undefined
      : 'Kiểm tra PM2, quyền data/storage, Cloudflare và reverse proxy.',
    metadata: {
      httpStatus: result.status,
      healthStatus,
      contentType: result.contentType,
    },
  };
}

async function probeDirectory(
  directory: string,
  label: string,
): Promise<CheckOutcome> {
  const fileName = `.release-center-probe-${process.pid}-${randomUUID()}.tmp`;
  const probePath = path.join(directory, fileName);
  const content = `release-center:${randomUUID()}`;

  try {
    const stats = await fs.stat(directory);
    if (!stats.isDirectory()) {
      return {
        status: 'FAIL',
        detail: `${label} tồn tại nhưng không phải thư mục.`,
        recommendation: 'Khôi phục đúng cấu trúc thư mục runtime.',
      };
    }

    await fs.writeFile(probePath, content, { encoding: 'utf8', flag: 'wx' });
    const readBack = await fs.readFile(probePath, 'utf8');

    if (readBack !== content) {
      return {
        status: 'FAIL',
        detail: `${label} ghi được nhưng dữ liệu đọc lại không khớp.`,
        recommendation: 'Kiểm tra ổ đĩa và phần mềm khóa/chống virus.',
      };
    }

    return {
      status: 'PASS',
      detail: `${label} đọc, ghi và xóa file probe thành công.`,
    };
  } catch (error) {
    return {
      status: 'FAIL',
      detail: `${label}: ${formatError(error)}`,
      recommendation:
        'Kiểm tra quyền NTFS, antivirus và process đang khóa thư mục.',
    };
  } finally {
    await fs.rm(probePath, { force: true }).catch(() => undefined);
  }
}

async function jsonHealthCheck(): Promise<CheckOutcome> {
  const entries = await fs.readdir(dataDir, { withFileTypes: true });
  const jsonFiles = entries
    .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith('.json'))
    .map((entry) => entry.name)
    .sort((left, right) => left.localeCompare(right));
  const invalid: Array<{ name: string; error: string }> = [];
  let records = 0;

  for (const fileName of jsonFiles) {
    try {
      const raw = await fs.readFile(path.join(dataDir, fileName), 'utf8');
      const parsed = JSON.parse(raw) as unknown;
      records += Array.isArray(parsed)
        ? parsed.length
        : isRecord(parsed)
          ? Object.keys(parsed).length
          : 1;
    } catch (error) {
      invalid.push({
        name: fileName,
        error: formatError(error).slice(0, 300),
      });
    }
  }

  if (jsonFiles.length === 0) {
    return {
      status: 'FAIL',
      detail: 'Không tìm thấy file JSON runtime nào trong data/.',
      recommendation: 'Kiểm tra project root và phục hồi dữ liệu từ backup.',
    };
  }

  return {
    status: invalid.length === 0 ? 'PASS' : 'FAIL',
    detail: invalid.length === 0
      ? `${jsonFiles.length} file JSON parse thành công (${records} bản ghi/thuộc tính).`
      : `${invalid.length}/${jsonFiles.length} file JSON không parse được.`,
    recommendation: invalid.length === 0
      ? undefined
      : 'Không ghi đè file lỗi. Tạo bản sao và khôi phục từ backup đã xác minh.',
    metadata: {
      files: jsonFiles.length,
      records,
      invalid,
    },
  };
}

async function uploadSessionCheck(): Promise<CheckOutcome> {
  const root = path.join(storageRoot, 'upload-sessions');
  const entries = await fs
    .readdir(root, { withFileTypes: true })
    .catch(() => [] as Dirent[]);
  let total = 0;
  let stale = 0;
  let corrupt = 0;
  let bytes = 0;
  const now = Date.now();

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    total += 1;
    const directory = path.join(root, entry.name);

    try {
      const raw = await fs.readFile(path.join(directory, 'manifest.json'), 'utf8');
      const manifest = JSON.parse(raw) as JsonRecord;
      const updatedAt = Date.parse(String(manifest.updatedAt ?? ''));
      const payload = await fs
        .stat(path.join(directory, 'payload.part'))
        .catch(() => null);

      if (!Number.isFinite(updatedAt)) {
        corrupt += 1;
      } else if (now - updatedAt >= 24 * 60 * 60 * 1_000) {
        stale += 1;
      }

      if (payload?.isFile()) bytes += payload.size;
    } catch {
      corrupt += 1;
    }
  }

  const status: ReleaseCheckStatus = corrupt > 0
    ? 'FAIL'
    : stale > 0
      ? 'WARNING'
      : 'PASS';

  return {
    status,
    detail: `${total} phiên upload; ${stale} quá 24 giờ; ${corrupt} manifest lỗi.`,
    recommendation: status === 'PASS'
      ? undefined
      : 'Đối chiếu phiên upload trước khi quarantine hoặc xóa thủ công.',
    metadata: { total, stale, corrupt, bytes },
  };
}

async function diskSpaceCheck(): Promise<CheckOutcome> {
  const stats = await fs.statfs(projectRoot);
  const totalBytes = Number(stats.blocks) * Number(stats.bsize);
  const freeBytes = Number(stats.bavail) * Number(stats.bsize);
  const freePercent = totalBytes > 0 ? (freeBytes / totalBytes) * 100 : 0;

  const status: ReleaseCheckStatus =
    freeBytes < 512 * MEBIBYTE || freePercent < 3
      ? 'FAIL'
      : freeBytes < 2 * 1024 * MEBIBYTE || freePercent < 10
        ? 'WARNING'
        : 'PASS';

  return {
    status,
    detail: `Còn ${(freeBytes / (1024 ** 3)).toFixed(2)} GB (${freePercent.toFixed(1)}%).`,
    recommendation: status === 'PASS'
      ? undefined
      : 'Dọn backup, file tạm hoặc storage không còn sử dụng trước khi build/upload.',
    metadata: { totalBytes, freeBytes, freePercent },
  };
}

async function portOwnerCheck(): Promise<CheckOutcome> {
  if (process.platform !== 'win32') {
    return {
      status: 'WARNING',
      detail: `Không kiểm tra PID giữ cổng trên nền tảng ${process.platform}.`,
      recommendation: 'Xác minh listener bằng công cụ quản lý process của máy chủ.',
    };
  }

  const port = Number(process.env.PORT ?? 3000) || 3000;
  const command = [
    `$rows = @(Get-NetTCPConnection -LocalPort ${port} -State Listen -ErrorAction SilentlyContinue | Select-Object LocalAddress,LocalPort,OwningProcess)`,
    `[Console]::Out.Write(($rows | ConvertTo-Json -Compress))`,
  ].join('; ');

  const { stdout } = await execFileAsync(
    'powershell.exe',
    ['-NoProfile', '-NonInteractive', '-Command', command],
    {
      timeout: 5_000,
      windowsHide: true,
      maxBuffer: 64 * 1024,
      encoding: 'utf8',
    },
  );
  const trimmed = stdout.trim();
  const parsed = trimmed ? JSON.parse(trimmed) as unknown : [];
  const rows = Array.isArray(parsed) ? parsed : parsed ? [parsed] : [];
  const owners = Array.from(
    new Set(
      rows
        .filter(isRecord)
        .map((row) => Number(row.OwningProcess))
        .filter((value) => Number.isInteger(value) && value > 0),
    ),
  );

  if (owners.length === 0) {
    return {
      status: 'FAIL',
      detail: `Không có process lắng nghe cổng ${port}.`,
      recommendation: 'Kiểm tra PM2 và khởi động đúng process modviethoa.',
    };
  }

  const ownedByRuntime = owners.length === 1 && owners[0] === process.pid;

  return {
    status: ownedByRuntime ? 'PASS' : 'FAIL',
    detail: ownedByRuntime
      ? `PID ${process.pid} hiện tại là process duy nhất giữ cổng ${port}.`
      : `Cổng ${port} do PID ${owners.join(', ')} giữ; runtime hiện tại là PID ${process.pid}.`,
    recommendation: ownedByRuntime
      ? undefined
      : 'Dừng process Next.js mồ côi và chỉ khởi động ứng dụng qua PM2.',
    metadata: { port, owners, runtimePid: process.pid },
  };
}

async function pm2Check(): Promise<CheckOutcome> {
  const pmId = process.env.pm_id?.trim() || process.env.NODE_APP_INSTANCE?.trim();
  const processName = process.env.name?.trim() || process.env.pm_exec_path?.trim();
  const restartCount = Number(process.env.restart_time ?? 0);
  const managed = Boolean(pmId);

  return {
    status: managed ? 'PASS' : 'WARNING',
    detail: managed
      ? `Runtime đang được PM2 quản lý (pm_id=${pmId}, PID=${process.pid}).`
      : `Không tìm thấy dấu vết PM2 trong environment của PID ${process.pid}.`,
    recommendation: managed
      ? undefined
      : 'Production nên chạy duy nhất qua PM2; không chạy npm start/next start riêng.',
    metadata: {
      managed,
      pmId: pmId || null,
      processName: processName || null,
      restartCount: Number.isFinite(restartCount) ? restartCount : null,
      pm2HomeConfigured: Boolean(process.env.PM2_HOME?.trim()),
    },
  };
}

async function newestModifiedAt(root: string): Promise<number> {
  let newest = 0;
  const entries = await fs.readdir(root, { withFileTypes: true });

  for (const entry of entries) {
    const absolutePath = path.join(root, entry.name);

    if (entry.isDirectory()) {
      newest = Math.max(newest, await newestModifiedAt(absolutePath));
    } else if (entry.isFile()) {
      const stats = await fs.stat(absolutePath);
      newest = Math.max(newest, stats.mtimeMs);
    }
  }

  return newest;
}

async function buildFreshnessCheck(): Promise<CheckOutcome> {
  const buildIdPath = path.join(projectRoot, '.next', 'BUILD_ID');
  const requiredFilesPath = path.join(projectRoot, '.next', 'required-server-files.json');
  const [buildIdStats, buildId, requiredRaw] = await Promise.all([
    fs.stat(buildIdPath),
    fs.readFile(buildIdPath, 'utf8'),
    fs.readFile(requiredFilesPath, 'utf8'),
  ]);
  JSON.parse(requiredRaw);

  const roots = [path.join(projectRoot, 'src')];
  const configNames = [
    'package.json',
    'package-lock.json',
    'next.config.ts',
    'next.config.js',
    'next.config.mjs',
    'tsconfig.json',
  ];
  let newestSource = 0;

  for (const root of roots) {
    newestSource = Math.max(newestSource, await newestModifiedAt(root));
  }

  for (const configName of configNames) {
    const configPath = path.join(projectRoot, configName);
    try {
      newestSource = Math.max(newestSource, (await fs.stat(configPath)).mtimeMs);
    } catch {
      // Optional config file.
    }
  }

  const stale = newestSource > buildIdStats.mtimeMs + BUILD_STALE_TOLERANCE_MS;

  return {
    status: stale ? 'FAIL' : 'PASS',
    detail: stale
      ? 'Source/config mới hơn production build hiện tại.'
      : `Production build ${buildId.trim().slice(0, 32)} khớp thời gian source.`,
    recommendation: stale
      ? 'Chạy npm run build thành công rồi restart PM2 trước khi phát hành.'
      : undefined,
    metadata: {
      buildCreatedAt: buildIdStats.mtime.toISOString(),
      newestSourceAt: new Date(newestSource).toISOString(),
    },
  };
}

async function environmentSecurityCheck(): Promise<CheckOutcome> {
  const authSecretLength = process.env.AUTH_SECRET?.trim().length ?? 0;
  const appUrl = process.env.APP_URL?.trim() || process.env.NEXT_PUBLIC_SITE_URL?.trim() || '';
  const hasSepayHmac = (process.env.SEPAY_WEBHOOK_SECRET?.trim().length ?? 0) >= 32;
  const hasSepayApiKey = Boolean(process.env.SEPAY_WEBHOOK_API_KEY?.trim());
  const production = process.env.NODE_ENV === 'production';
  const problems: string[] = [];
  const warnings: string[] = [];

  if (authSecretLength < 32) problems.push('AUTH_SECRET ngắn hơn 32 ký tự');
  if (!appUrl || !appUrl.startsWith('https://')) problems.push('APP_URL chưa dùng HTTPS');
  if (!production) warnings.push(`NODE_ENV=${process.env.NODE_ENV ?? '(trống)'}`);
  if (isSepayAutomationEnabled() && !hasSepayHmac && !hasSepayApiKey) {
    problems.push('SePay automation bật nhưng thiếu credential');
  }
  if (!hasSepayHmac && hasSepayApiKey) {
    warnings.push('SePay đang dùng API Key legacy thay cho HMAC');
  }

  const status: ReleaseCheckStatus = problems.length > 0
    ? 'FAIL'
    : warnings.length > 0
      ? 'WARNING'
      : 'PASS';

  return {
    status,
    detail: [
      problems.length > 0 ? `Lỗi: ${problems.join('; ')}.` : 'Credential bắt buộc đã được cấu hình.',
      warnings.length > 0 ? `Chú ý: ${warnings.join('; ')}.` : '',
    ].filter(Boolean).join(' '),
    recommendation: status === 'PASS'
      ? undefined
      : 'Sửa .env.production, không in secret và restart PM2 với --update-env.',
    metadata: {
      production,
      authSecretConfigured: authSecretLength >= 32,
      appUrlHttps: appUrl.startsWith('https://'),
      sepayHmacConfigured: hasSepayHmac,
      sepayLegacyApiKeyConfigured: hasSepayApiKey,
      sepayAutomationEnabled: isSepayAutomationEnabled(),
    },
  };
}

async function routeManifestCheck(): Promise<CheckOutcome> {
  const manifestPath = path.join(projectRoot, '.next', 'server', 'app-paths-manifest.json');
  const raw = await fs.readFile(manifestPath, 'utf8');
  const manifest = JSON.parse(raw) as unknown;

  if (!isRecord(manifest)) {
    throw new Error('app-paths-manifest.json không phải object.');
  }

  const keys = Object.keys(manifest);
  const missing = CRITICAL_ROUTE_KEYS.filter(
    (expected) => !keys.some((key) => key === expected || key.startsWith(`${expected}/`)),
  );

  return {
    status: missing.length === 0 ? 'PASS' : 'FAIL',
    detail: missing.length === 0
      ? `${CRITICAL_ROUTE_KEYS.length} route trọng yếu đã có trong production build.`
      : `Thiếu ${missing.length} route trong production build.`,
    recommendation: missing.length === 0
      ? undefined
      : 'Xóa .next, build lại và không restart PM2 nếu build thất bại.',
    metadata: { expected: CRITICAL_ROUTE_KEYS.length, missing },
  };
}

async function communityMediaCheck(): Promise<CheckOutcome> {
  const manifestPath = path.join(projectRoot, 'public', 'community-media', 'library.json');
  const raw = await fs.readFile(manifestPath, 'utf8');
  const parsed = JSON.parse(raw) as unknown;

  if (!Array.isArray(parsed)) {
    return {
      status: 'FAIL',
      detail: 'community-media/library.json không phải array.',
      recommendation: 'Khôi phục manifest media hợp lệ trước khi phát hành.',
    };
  }

  const idPattern = /^[a-z0-9][a-z0-9_-]{1,63}$/;
  const iconPattern = /^\/community-media\/icons\/[a-zA-Z0-9._-]+\.(?:svg|png|webp|jpe?g)$/i;
  const gifPattern = /^\/community-media\/gifs\/[a-zA-Z0-9._-]+\.(?:gif|webp)$/i;
  const seen = new Set<string>();
  const invalid: number[] = [];
  const missingFiles: string[] = [];

  for (const [index, item] of parsed.entries()) {
    if (!isRecord(item)) {
      invalid.push(index);
      continue;
    }

    const id = String(item.id ?? '').trim().toLowerCase();
    const label = String(item.label ?? '').trim();
    const kind = String(item.kind ?? '').trim().toUpperCase();
    const src = String(item.src ?? '').trim();
    const validSource = kind === 'ICON'
      ? iconPattern.test(src)
      : kind === 'GIF'
        ? gifPattern.test(src)
        : false;

    if (!idPattern.test(id) || !label || !validSource || src.includes('..') || seen.has(id)) {
      invalid.push(index);
      continue;
    }

    seen.add(id);
    const absolutePath = path.join(projectRoot, 'public', ...src.replace(/^\//, '').split('/'));

    try {
      const stats = await fs.stat(absolutePath);
      if (!stats.isFile()) missingFiles.push(src);
    } catch {
      missingFiles.push(src);
    }
  }

  const failed = invalid.length > 0 || missingFiles.length > 0;
  const empty = parsed.length === 0;

  return {
    status: failed ? 'FAIL' : empty ? 'WARNING' : 'PASS',
    detail: failed
      ? `${invalid.length} mục không hợp lệ; ${missingFiles.length} file bị thiếu.`
      : `${parsed.length} icon/GIF hợp lệ và có file tương ứng.`,
    recommendation: failed
      ? 'Chạy công cụ đồng bộ media và kiểm tra lại library.json.'
      : empty
        ? 'Thêm media hoặc xác nhận thư viện trống là chủ ý.'
        : undefined,
    metadata: {
      assets: parsed.length,
      invalidIndexes: invalid.slice(0, 50),
      missingFiles: missingFiles.slice(0, 50),
    },
  };
}

async function richTextCheck(): Promise<CheckOutcome> {
  const sample = '[b]Đậm[/b] [center]Giữa[/center] [ol][li]Một[/li][li]Hai[/li][/ol]';
  const plain = richTextToPlainText(sample);
  const nodes = parseRichText('<color=#35caff>Màu</color><script>alert(1)</script>');
  const colorSafe = safeRichTextColor('#35caff') === '#35caff';
  const colorBlocked = safeRichTextColor('url(javascript:alert(1))') === undefined;
  const sizeBounded = safeRichTextSize('999px') === '32px';
  const passed =
    plain === 'Đậm Giữa MộtHai' &&
    nodes.length > 0 &&
    colorSafe &&
    colorBlocked &&
    sizeBounded;

  return {
    status: passed ? 'PASS' : 'FAIL',
    detail: passed
      ? 'Parser thẻ góc/thẻ vuông, align, numbering và bộ lọc CSS đạt self-test.'
      : 'Rich-text self-test không đạt kết quả mong đợi.',
    recommendation: passed
      ? undefined
      : 'Không phát hành cho tới khi parser và renderer được kiểm tra lại.',
    metadata: { plain, nodeCount: nodes.length, colorSafe, colorBlocked, sizeBounded },
  };
}

async function interactiveCommentContractCheck(): Promise<CheckOutcome> {
  const contracts = [
    {
      path: 'src/components/CommentForm.tsx',
      required: ["fetch('/api/comments/create'", 'onCreated('],
    },
    {
      path: 'src/components/comments/ReplyCommentForm.tsx',
      required: ["fetch('/api/comments/create'", 'onCreated('],
    },
    {
      path: 'src/components/ReviewForm.tsx',
      required: ["fetch('/api/reviews/upsert'", 'onSaved('],
    },
    {
      path: 'src/components/comments/CommentSectionClient.tsx',
      required: ['setComments(', 'handleCreated'],
    },
    {
      path: 'src/components/reviews/ReviewSectionClient.tsx',
      required: ['setReviews(', 'handleSaved'],
    },
  ];
  const problems: string[] = [];

  for (const contract of contracts) {
    const content = await fs.readFile(
      path.join(projectRoot, contract.path),
      'utf8',
    );

    for (const required of contract.required) {
      if (!content.includes(required)) {
        problems.push(`${contract.path}: thiếu ${required}`);
      }
    }

    if (/\b(?:window\.)?location\.reload\s*\(/.test(content)) {
      problems.push(`${contract.path}: còn location.reload()`);
    }
  }

  return {
    status: problems.length === 0 ? 'PASS' : 'FAIL',
    detail: problems.length === 0
      ? 'Bình luận, reply và đánh giá giữ cơ chế fetch + cập nhật state nội bộ.'
      : `${problems.length} vi phạm contract cập nhật nội bộ.`,
    recommendation: problems.length === 0
      ? undefined
      : 'Loại bỏ reload toàn trang và cập nhật state/router nội bộ.',
    metadata: { problems },
  };
}

async function modReportContractCheck(): Promise<CheckOutcome> {
  const routePath = path.join(projectRoot, 'src', 'app', 'api', 'mod-error-reports', 'route.ts');
  const panelPath = path.join(projectRoot, 'src', 'components', 'mod-reports', 'ModErrorReportPanel.tsx');
  const [routeSource, panelSource] = await Promise.all([
    fs.readFile(routePath, 'utf8'),
    fs.readFile(panelPath, 'utf8'),
  ]);
  const imageRangePresent = /images\.length\s*<\s*1\s*\|\|\s*images\.length\s*>\s*3/.test(routeSource);
  const validationPresent = routeSource.includes('validateImageFile');
  const panelPresent = panelSource.includes('images') && panelSource.includes('3');
  const sizeCorrect = MAX_IMAGE_FILE_BYTES === 2 * MEBIBYTE;
  const passed = imageRangePresent && validationPresent && panelPresent && sizeCorrect;

  return {
    status: passed ? 'PASS' : 'FAIL',
    detail: passed
      ? 'Báo cáo lỗi mod bắt buộc 1–3 ảnh, giới hạn 2 MiB và xác minh định dạng phía server.'
      : 'Contract ảnh báo cáo lỗi mod không còn đầy đủ.',
    recommendation: passed
      ? undefined
      : 'Khôi phục validation client/server trước khi phát hành.',
    metadata: { imageRangePresent, validationPresent, panelPresent, sizeCorrect },
  };
}

async function backupFreshnessCheck(): Promise<CheckOutcome> {
  const backups = await listRuntimeBackups();
  const latest = backups[0];

  if (!latest) {
    return {
      status: 'FAIL',
      detail: 'Chưa có runtime backup nào.',
      recommendation: 'Tạo backup JSON tại Trung tâm vận hành trước khi phát hành.',
    };
  }

  const ageMs = Date.now() - Date.parse(latest.createdAt);
  const ageHours = ageMs / (60 * 60 * 1_000);
  const status: ReleaseCheckStatus = ageHours <= 24
    ? 'PASS'
    : ageHours <= 7 * 24
      ? 'WARNING'
      : 'FAIL';

  return {
    status,
    detail: `Backup gần nhất cách đây ${ageHours.toFixed(1)} giờ (${latest.id}).`,
    recommendation: status === 'PASS'
      ? undefined
      : 'Tạo backup mới trước khi áp dụng patch hoặc migration.',
    metadata: { id: latest.id, createdAt: latest.createdAt, bytes: latest.bytes, ageHours },
  };
}

async function integrityCheck(input: {
  actorUserId: string;
  requestId?: string;
}): Promise<{ outcome: CheckOutcome; report: SystemIntegrityReport }> {
  const report = await runSystemIntegrityScan(input);
  const failed = report.summary.critical + report.summary.errors;
  const warnings = report.summary.warnings;
  const status: ReleaseCheckStatus = failed > 0
    ? 'FAIL'
    : warnings > 0
      ? 'WARNING'
      : 'PASS';

  return {
    report,
    outcome: {
      status,
      detail: `${report.summary.filesScanned} file, ${report.summary.recordsScanned} bản ghi; ${report.summary.critical} nghiêm trọng, ${report.summary.errors} lỗi, ${warnings} cảnh báo.`,
      recommendation: status === 'PASS'
        ? undefined
        : 'Mở Trung tâm vận hành, xem từng vấn đề và không repair tự động.',
      metadata: {
        reportId: report.id,
        critical: report.summary.critical,
        errors: report.summary.errors,
        warnings,
        missingStorageFiles: report.summary.missingStorageFiles,
        orphanStorageFiles: report.summary.orphanStorageFiles,
      },
    },
  };
}

async function sepayCheck(): Promise<CheckOutcome> {
  const secret = process.env.SEPAY_WEBHOOK_SECRET?.trim() ?? '';
  const apiKey = process.env.SEPAY_WEBHOOK_API_KEY?.trim() ?? '';

  if (!secret && !apiKey) {
    return {
      status: 'FAIL',
      detail: 'Thiếu credential xác thực webhook SePay.',
      recommendation: 'Cấu hình SEPAY_WEBHOOK_SECRET và restart PM2 với --update-env.',
    };
  }

  const config = getSupportAccountConfig();
  const rawBody = JSON.stringify({
    id: 0,
    gateway: 'RELEASE_CENTER',
    transactionDate: new Date().toISOString(),
    accountNumber: config.bankAccount,
    transferType: 'in',
    transferAmount: 0,
    content: 'RELEASE_CENTER_HMAC_PROBE',
  });
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  let authMode = 'API_KEY';

  if (secret) {
    const timestamp = String(Math.floor(Date.now() / 1_000));
    const signature = createHmac('sha256', secret)
      .update(`${timestamp}.${rawBody}`, 'utf8')
      .digest('hex');
    headers['X-SePay-Timestamp'] = timestamp;
    headers['X-SePay-Signature'] = `sha256=${signature}`;
    authMode = 'HMAC_SHA256';
  } else {
    headers.Authorization = `Apikey ${apiKey}`;
  }

  const endpoint = new URL('/api/webhooks/sepay', PUBLIC_SITE_URL).toString();
  const result = await fetchJson(
    endpoint,
    { method: 'POST', headers, body: rawBody },
    10_000,
  );
  const body = isRecord(result.body) ? result.body : {};
  const success = result.status === 200 && body.success === true;

  return {
    status: success ? 'PASS' : 'FAIL',
    detail: success
      ? `Webhook SePay public nhận payload id=0 bằng ${authMode} và trả HTTP 200; không ghi giao dịch.`
      : `Webhook SePay public trả HTTP ${result.status}.`,
    recommendation: success
      ? undefined
      : 'Kiểm tra HMAC secret, Cloudflare, PM2 và lịch sử gửi webhook.',
    metadata: {
      httpStatus: result.status,
      authMode,
      testPayloadId: 0,
      automationEnabled: isSepayAutomationEnabled(),
    },
  };
}

function quickDefinitions(): CheckDefinition[] {
  return [
    {
      key: 'runtime-pm2',
      category: 'RUNTIME',
      title: 'PM2 quản lý runtime',
      run: pm2Check,
    },
    {
      key: 'runtime-port-owner',
      category: 'RUNTIME',
      title: 'PID giữ cổng ứng dụng',
      run: portOwnerCheck,
    },
    {
      key: 'network-local-health',
      category: 'NETWORK',
      title: 'Health endpoint nội bộ',
      run: () => healthCheck(`${localBaseUrl()}/api/health`, 'Endpoint nội bộ'),
    },
    {
      key: 'network-public-health',
      category: 'NETWORK',
      title: 'Health endpoint public',
      run: () => healthCheck(new URL('/api/health', PUBLIC_SITE_URL).toString(), 'Endpoint public'),
    },
    {
      key: 'storage-data-write',
      category: 'STORAGE',
      title: 'Quyền đọc/ghi data',
      run: () => probeDirectory(dataDir, 'data/'),
    },
    {
      key: 'storage-root-write',
      category: 'STORAGE',
      title: 'Quyền đọc/ghi storage',
      run: () => probeDirectory(storageRoot, 'storage/'),
    },
    {
      key: 'storage-disk-space',
      category: 'STORAGE',
      title: 'Dung lượng ổ đĩa',
      run: diskSpaceCheck,
    },
    {
      key: 'json-parse',
      category: 'JSON',
      title: 'JSON runtime parse được',
      run: jsonHealthCheck,
    },
    {
      key: 'upload-sessions',
      category: 'STORAGE',
      title: 'Phiên upload tạm',
      run: uploadSessionCheck,
    },
    {
      key: 'build-freshness',
      category: 'BUILD',
      title: 'Production build khớp source',
      timeoutMs: 20_000,
      run: buildFreshnessCheck,
    },
    {
      key: 'environment-security',
      category: 'SECURITY',
      title: 'Cấu hình production an toàn',
      run: environmentSecurityCheck,
    },
  ];
}

function releaseDefinitions(): CheckDefinition[] {
  return [
    {
      key: 'build-routes',
      category: 'BUILD',
      title: 'Route trọng yếu đã được build',
      run: routeManifestCheck,
    },
    {
      key: 'feature-rich-text',
      category: 'FEATURE',
      title: 'Rich-text parser self-test',
      run: richTextCheck,
    },
    {
      key: 'feature-community-media',
      category: 'FEATURE',
      title: 'Thư viện icon/GIF',
      timeoutMs: 20_000,
      run: communityMediaCheck,
    },
    {
      key: 'feature-comment-refresh',
      category: 'FEATURE',
      title: 'Bình luận và đánh giá cập nhật nội bộ',
      run: interactiveCommentContractCheck,
    },
    {
      key: 'feature-mod-error-report',
      category: 'FEATURE',
      title: 'Báo cáo lỗi mod và ảnh đính kèm',
      run: modReportContractCheck,
    },
    {
      key: 'backup-freshness',
      category: 'BACKUP',
      title: 'Backup trước phát hành',
      run: backupFreshnessCheck,
    },
    {
      key: 'sepay-public-hmac',
      category: 'SECURITY',
      title: 'Webhook SePay public/HMAC',
      timeoutMs: 15_000,
      run: sepayCheck,
    },
  ];
}

function summarize(checks: ReleaseCheckItem[]): ReleaseCheckReport['summary'] {
  const passed = checks.filter((check) => check.status === 'PASS').length;
  const warnings = checks.filter((check) => check.status === 'WARNING').length;
  const failed = checks.filter((check) => check.status === 'FAIL').length;

  return { passed, warnings, failed, total: checks.length };
}

function verdictFor(summary: ReleaseCheckReport['summary']): ReleaseCheckVerdict {
  if (summary.failed > 0) return 'BLOCKED';
  if (summary.warnings > 0) return 'REVIEW';
  return 'READY';
}

async function saveReport(report: ReleaseCheckReport): Promise<void> {
  const reports = await readJsonAtomic<ReleaseCheckReport[]>(reportsPath, []);
  reports.push(report);
  const retained = reports
    .slice()
    .sort((left, right) => left.createdAt.localeCompare(right.createdAt))
    .slice(-REPORT_RETENTION);
  await writeJsonAtomic(reportsPath, retained);
}

export async function getReleaseCheckReports(
  limit = 30,
): Promise<ReleaseCheckReport[]> {
  const safeLimit = Math.max(1, Math.min(REPORT_RETENTION, Math.round(limit)));
  const reports = await readJsonAtomic<ReleaseCheckReport[]>(reportsPath, []);

  return reports
    .slice()
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
    .slice(0, safeLimit);
}

export async function getReleaseCheckReportById(
  id: string,
): Promise<ReleaseCheckReport | null> {
  const cleanId = id.trim();
  if (!/^[a-f0-9-]{36}$/i.test(cleanId)) return null;
  const reports = await readJsonAtomic<ReleaseCheckReport[]>(reportsPath, []);
  return reports.find((report) => report.id === cleanId) ?? null;
}

export async function getReleaseCenterOverview(): Promise<ReleaseCenterOverview> {
  const reports = await getReleaseCheckReports(30);

  return {
    generatedAt: new Date().toISOString(),
    latestReport: reports[0] ?? null,
    latestQuickReport: reports.find((report) => report.mode === 'QUICK') ?? null,
    latestReleaseReport: reports.find((report) => report.mode === 'RELEASE') ?? null,
    reports,
  };
}

export async function runReleaseCheck(input: {
  mode: ReleaseCheckMode;
  actorUserId: string;
  reason?: unknown;
  requestId?: string;
}): Promise<ReleaseCheckReport> {
  return withReleaseCheckLock(async () => {
    const startedAt = Date.now();
    const checks: ReleaseCheckItem[] = [];
    let integrityReportId: string | undefined;

    for (const definition of quickDefinitions()) {
      checks.push(await executeCheck(definition));
    }

    if (input.mode === 'RELEASE') {
      for (const definition of releaseDefinitions()) {
        checks.push(await executeCheck({
          ...definition,
          timeoutMs: definition.timeoutMs ?? RELEASE_CHECK_TIMEOUT_MS,
        }));
      }

      const integrityStartedAt = Date.now();
      try {
        const integrity = await withTimeout(
          integrityCheck({
            actorUserId: input.actorUserId,
            requestId: input.requestId,
          }),
          RELEASE_CHECK_TIMEOUT_MS,
          'Kiểm tra toàn vẹn dữ liệu',
        );
        integrityReportId = integrity.report.id;
        checks.push({
          id: randomUUID(),
          key: 'integrity-full-scan',
          category: 'INTEGRITY',
          title: 'Toàn vẹn quan hệ dữ liệu và storage',
          durationMs: Date.now() - integrityStartedAt,
          ...integrity.outcome,
        });
      } catch (error) {
        checks.push({
          id: randomUUID(),
          key: 'integrity-full-scan',
          category: 'INTEGRITY',
          status: 'FAIL',
          title: 'Toàn vẹn quan hệ dữ liệu và storage',
          detail: formatError(error),
          recommendation: 'Mở Trung tâm vận hành và chạy quét toàn vẹn riêng để chẩn đoán.',
          durationMs: Date.now() - integrityStartedAt,
        });
      }
    }

    const summary = summarize(checks);
    const report: ReleaseCheckReport = {
      id: randomUUID(),
      mode: input.mode,
      createdAt: new Date().toISOString(),
      createdByUserId: input.actorUserId,
      reason: cleanReason(input.reason),
      durationMs: Date.now() - startedAt,
      verdict: verdictFor(summary),
      summary,
      runtime: {
        processId: process.pid,
        projectRoot,
        nodeVersion: process.version,
        nodeEnv: process.env.NODE_ENV ?? 'unknown',
        applicationVersion: await applicationVersion(),
      },
      checks,
      integrityReportId,
    };

    await saveReport(report);

    await appendAdminAuditLog({
      actorUserId: input.actorUserId,
      action: input.mode === 'RELEASE'
        ? 'RELEASE_CHECK_COMPLETED'
        : 'QUICK_CHECK_COMPLETED',
      targetType: 'RELEASE_CHECK_REPORT',
      targetId: report.id,
      reason: report.reason,
      requestId: input.requestId,
      after: {
        mode: report.mode,
        verdict: report.verdict,
        durationMs: report.durationMs,
        summary: report.summary,
        integrityReportId: report.integrityReportId,
      },
    }).catch((error) => {
      console.error('[release-center] Không thể ghi audit log:', error);
    });

    return report;
  });
}
