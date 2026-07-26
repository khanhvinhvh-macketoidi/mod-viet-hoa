import 'server-only';

import crypto from 'node:crypto';
import type { Dirent } from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';
import {
  MAX_MOD_FILE_BYTES,
  MOD_UPLOAD_CHUNK_BYTES,
} from '@/lib/upload-limits';
import {
  safeFileName,
  validateArchiveMetadata,
} from '@/lib/security/upload-security';

const SESSION_TTL_MS = 24 * 60 * 60 * 1000;
const SESSION_ID_PATTERN = /^[0-9a-f-]{36}$/i;
const MANIFEST_FILE = 'manifest.json';
const PAYLOAD_FILE = 'payload.part';
const LOCK_FILE = '.lock';

type UploadStatus = 'UPLOADING' | 'READY' | 'CONSUMING';

export type ChunkedUploadManifest = {
  id: string;
  userId: string;
  originalFileName: string;
  safeOriginalFileName: string;
  totalBytes: number;
  receivedBytes: number;
  status: UploadStatus;
  createdAt: string;
  updatedAt: string;
};

export type ClaimedChunkedUpload = {
  sessionId: string;
  originalFileName: string;
  safeOriginalFileName: string;
  totalBytes: number;
  payloadPath: string;
};

function uploadSessionRoot(): string {
  return path.join(process.cwd(), 'storage', 'upload-sessions');
}

function assertSessionId(sessionId: string): void {
  if (!SESSION_ID_PATTERN.test(sessionId)) {
    throw new Error('Phiên tải lên không hợp lệ.');
  }
}

function sessionDirectory(sessionId: string): string {
  assertSessionId(sessionId);
  return path.join(uploadSessionRoot(), sessionId);
}

function manifestPath(sessionId: string): string {
  return path.join(sessionDirectory(sessionId), MANIFEST_FILE);
}

function payloadPath(sessionId: string): string {
  return path.join(sessionDirectory(sessionId), PAYLOAD_FILE);
}

function lockPath(sessionId: string): string {
  return path.join(sessionDirectory(sessionId), LOCK_FILE);
}

function isExpired(manifest: ChunkedUploadManifest): boolean {
  const updatedAt = Date.parse(manifest.updatedAt);

  return (
    !Number.isFinite(updatedAt) ||
    Date.now() - updatedAt > SESSION_TTL_MS
  );
}

async function writeManifest(
  manifest: ChunkedUploadManifest,
): Promise<void> {
  await fs.writeFile(
    manifestPath(manifest.id),
    `${JSON.stringify(manifest, null, 2)}\n`,
    { encoding: 'utf8' },
  );
}

async function readManifest(
  sessionId: string,
): Promise<ChunkedUploadManifest> {
  const raw = await fs.readFile(manifestPath(sessionId), 'utf8');
  const parsed = JSON.parse(raw) as Partial<ChunkedUploadManifest>;

  if (
    parsed.id !== sessionId ||
    typeof parsed.userId !== 'string' ||
    typeof parsed.originalFileName !== 'string' ||
    typeof parsed.safeOriginalFileName !== 'string' ||
    typeof parsed.totalBytes !== 'number' ||
    typeof parsed.receivedBytes !== 'number' ||
    (parsed.status !== 'UPLOADING' &&
      parsed.status !== 'READY' &&
      parsed.status !== 'CONSUMING') ||
    typeof parsed.createdAt !== 'string' ||
    typeof parsed.updatedAt !== 'string'
  ) {
    throw new Error('Dữ liệu phiên tải lên bị hỏng.');
  }

  return parsed as ChunkedUploadManifest;
}

async function withSessionLock<T>(
  sessionId: string,
  operation: () => Promise<T>,
): Promise<T> {
  const targetLockPath = lockPath(sessionId);
  let handle: Awaited<ReturnType<typeof fs.open>> | null = null;

  try {
    handle = await fs.open(targetLockPath, 'wx');
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;

    if (code === 'EEXIST') {
      throw new Error(
        'Phiên tải lên đang được xử lý. Vui lòng thử lại.',
      );
    }

    throw error;
  }

  try {
    return await operation();
  } finally {
    await handle.close().catch(() => undefined);
    await fs.unlink(targetLockPath).catch(() => undefined);
  }
}

function assertOwnedActiveSession(
  manifest: ChunkedUploadManifest,
  userId: string,
): void {
  if (manifest.userId !== userId) {
    throw new Error('Bạn không có quyền dùng phiên tải lên này.');
  }

  if (isExpired(manifest)) {
    throw new Error('Phiên tải lên đã hết hạn.');
  }
}

async function readPayloadRange(
  filePath: string,
  offset: number,
  length: number,
): Promise<Buffer> {
  const file = await fs.open(filePath, 'r');

  try {
    const buffer = Buffer.alloc(length);
    const result = await file.read(buffer, 0, length, offset);
    return buffer.subarray(0, result.bytesRead);
  } finally {
    await file.close();
  }
}

export async function removeExpiredUploadSessions(): Promise<void> {
  const root = uploadSessionRoot();
  await fs.mkdir(root, { recursive: true });

  let entries: Dirent[];

  try {
    entries = await fs.readdir(root, { withFileTypes: true });
  } catch {
    return;
  }

  await Promise.allSettled(
    entries
      .filter((entry) => entry.isDirectory())
      .map(async (entry) => {
        const sessionId = entry.name;

        if (!SESSION_ID_PATTERN.test(sessionId)) return;

        try {
          try {
            const lockStats = await fs.stat(lockPath(sessionId));

            if (Date.now() - lockStats.mtimeMs < 15 * 60 * 1000) {
              return;
            }

            await fs.unlink(lockPath(sessionId)).catch(() => undefined);
          } catch {
            // Không có lock: phiên không được xử lý tại thời điểm cleanup.
          }

          const manifest = await readManifest(sessionId);

          if (isExpired(manifest)) {
            await fs.rm(sessionDirectory(sessionId), {
              recursive: true,
              force: true,
            });
          }
        } catch {
          await fs.rm(sessionDirectory(sessionId), {
            recursive: true,
            force: true,
          });
        }
      }),
  );
}

export async function createChunkedUploadSession(input: {
  userId: string;
  fileName: string;
  fileSize: number;
}): Promise<ChunkedUploadManifest> {
  validateArchiveMetadata(input.fileName, input.fileSize);

  if (input.fileSize > MAX_MOD_FILE_BYTES) {
    throw new Error('File mod vượt quá giới hạn 500 MB.');
  }

  await removeExpiredUploadSessions();

  const id = crypto.randomUUID();
  const directory = sessionDirectory(id);
  const now = new Date().toISOString();
  const manifest: ChunkedUploadManifest = {
    id,
    userId: input.userId,
    originalFileName: input.fileName,
    safeOriginalFileName: safeFileName(input.fileName),
    totalBytes: input.fileSize,
    receivedBytes: 0,
    status: 'UPLOADING',
    createdAt: now,
    updatedAt: now,
  };

  await fs.mkdir(directory, { recursive: false });

  try {
    await fs.writeFile(payloadPath(id), Buffer.alloc(0), {
      flag: 'wx',
    });
    await writeManifest(manifest);
  } catch (error) {
    await fs.rm(directory, { recursive: true, force: true });
    throw error;
  }

  return manifest;
}

export async function appendChunk(input: {
  sessionId: string;
  userId: string;
  offset: number;
  chunk: Uint8Array;
}): Promise<ChunkedUploadManifest> {
  if (
    !Number.isSafeInteger(input.offset) ||
    input.offset < 0 ||
    input.chunk.byteLength <= 0 ||
    input.chunk.byteLength > MOD_UPLOAD_CHUNK_BYTES
  ) {
    throw new Error('Chunk tải lên không hợp lệ.');
  }

  return withSessionLock(input.sessionId, async () => {
    let manifest = await readManifest(input.sessionId);
    assertOwnedActiveSession(manifest, input.userId);

    if (manifest.status !== 'UPLOADING') {
      throw new Error('Phiên tải lên không còn nhận thêm dữ liệu.');
    }

    const currentPayloadStats = await fs.stat(
      payloadPath(input.sessionId),
    );

    if (
      currentPayloadStats.size < manifest.receivedBytes ||
      currentPayloadStats.size > manifest.totalBytes
    ) {
      throw new Error('Dung lượng file tạm không khớp phiên tải lên.');
    }

    if (currentPayloadStats.size !== manifest.receivedBytes) {
      manifest = {
        ...manifest,
        receivedBytes: currentPayloadStats.size,
        updatedAt: new Date().toISOString(),
      };
      await writeManifest(manifest);
    }

    const chunkEnd = input.offset + input.chunk.byteLength;

    if (chunkEnd > manifest.totalBytes) {
      throw new Error('Chunk vượt quá dung lượng file đã khai báo.');
    }

    if (input.offset < manifest.receivedBytes) {
      if (chunkEnd > manifest.receivedBytes) {
        throw new Error(
          `Offset không hợp lệ. Offset hiện tại là ${manifest.receivedBytes}.`,
        );
      }

      const existing = await readPayloadRange(
        payloadPath(input.sessionId),
        input.offset,
        input.chunk.byteLength,
      );

      if (!existing.equals(Buffer.from(input.chunk))) {
        throw new Error('Chunk gửi lại không khớp dữ liệu đã lưu.');
      }

      return manifest;
    }

    if (input.offset !== manifest.receivedBytes) {
      throw new Error(
        `Offset không hợp lệ. Offset hiện tại là ${manifest.receivedBytes}.`,
      );
    }

    await fs.appendFile(
      payloadPath(input.sessionId),
      Buffer.from(input.chunk),
    );

    const updated: ChunkedUploadManifest = {
      ...manifest,
      receivedBytes: chunkEnd,
      updatedAt: new Date().toISOString(),
    };

    await writeManifest(updated);
    return updated;
  });
}

export async function completeChunkedUploadSession(input: {
  sessionId: string;
  userId: string;
}): Promise<ChunkedUploadManifest> {
  return withSessionLock(input.sessionId, async () => {
    const manifest = await readManifest(input.sessionId);
    assertOwnedActiveSession(manifest, input.userId);

    if (manifest.status === 'READY') {
      return manifest;
    }

    if (manifest.status !== 'UPLOADING') {
      throw new Error('Phiên tải lên đang được sử dụng.');
    }

    const fileStats = await fs.stat(payloadPath(input.sessionId));

    if (
      manifest.receivedBytes !== manifest.totalBytes ||
      fileStats.size !== manifest.totalBytes
    ) {
      throw new Error(
        `File chưa tải đủ: ${manifest.receivedBytes}/${manifest.totalBytes} byte.`,
      );
    }

    const updated: ChunkedUploadManifest = {
      ...manifest,
      status: 'READY',
      updatedAt: new Date().toISOString(),
    };

    await writeManifest(updated);
    return updated;
  });
}

export async function claimChunkedUploadSession(input: {
  sessionId: string;
  userId: string;
}): Promise<ClaimedChunkedUpload> {
  return withSessionLock(input.sessionId, async () => {
    const manifest = await readManifest(input.sessionId);
    assertOwnedActiveSession(manifest, input.userId);

    if (manifest.status !== 'READY') {
      throw new Error('File mod chưa tải lên hoàn tất.');
    }

    const fileStats = await fs.stat(payloadPath(input.sessionId));

    if (fileStats.size !== manifest.totalBytes) {
      throw new Error('Dung lượng file đã tải không khớp phiên.');
    }

    validateArchiveMetadata(
      manifest.originalFileName,
      manifest.totalBytes,
    );

    const updated: ChunkedUploadManifest = {
      ...manifest,
      status: 'CONSUMING',
      updatedAt: new Date().toISOString(),
    };

    await writeManifest(updated);

    return {
      sessionId: manifest.id,
      originalFileName: manifest.originalFileName,
      safeOriginalFileName: manifest.safeOriginalFileName,
      totalBytes: manifest.totalBytes,
      payloadPath: payloadPath(manifest.id),
    };
  });
}

export async function restoreClaimedUploadSession(input: {
  sessionId: string;
  userId: string;
  sourcePath?: string;
}): Promise<void> {
  await withSessionLock(input.sessionId, async () => {
    const manifest = await readManifest(input.sessionId);

    if (manifest.userId !== input.userId) {
      throw new Error('Bạn không có quyền khôi phục phiên tải lên.');
    }

    const targetPayloadPath = payloadPath(input.sessionId);

    await fs.mkdir(sessionDirectory(input.sessionId), {
      recursive: true,
    });

    if (
      input.sourcePath &&
      path.resolve(input.sourcePath) !== path.resolve(targetPayloadPath)
    ) {
      await fs.rename(input.sourcePath, targetPayloadPath);
    } else {
      await fs.stat(targetPayloadPath);
    }

    await writeManifest({
      ...manifest,
      status: 'READY',
      receivedBytes: manifest.totalBytes,
      updatedAt: new Date().toISOString(),
    });
  });
}

export async function removeChunkedUploadSession(input: {
  sessionId: string;
  userId: string;
  allowConsuming?: boolean;
}): Promise<void> {
  assertSessionId(input.sessionId);

  try {
    await withSessionLock(input.sessionId, async () => {
      const manifest = await readManifest(input.sessionId);

      if (manifest.userId !== input.userId) {
        throw new Error('Bạn không có quyền xóa phiên tải lên này.');
      }

      if (manifest.status === 'CONSUMING' && !input.allowConsuming) {
        throw new Error('Phiên tải lên đang được sử dụng.');
      }
    });

    await fs.rm(sessionDirectory(input.sessionId), {
      recursive: true,
      force: true,
    });
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;

    if (code === 'ENOENT') return;
    throw error;
  }
}

export function chunkUploadSizeBytes(): number {
  return MOD_UPLOAD_CHUNK_BYTES;
}
