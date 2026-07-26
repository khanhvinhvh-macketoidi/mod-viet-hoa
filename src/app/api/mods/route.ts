import fs from 'node:fs/promises';
import path from 'node:path';
import { NextResponse } from 'next/server';
import { requireCreator } from '@/lib/auth';
import { getMods, saveMods } from '@/lib/store';
import { createModPublishedNotifications } from '@/lib/notifications';
import {
  rewardModPublished,
  revokeModPublished,
} from '@/lib/cultivation-service';
import {
  rewardModApprovedReputation,
  revokeModApprovedReputation,
} from '@/lib/reputation-service';
import {
  claimChunkedUploadSession,
  removeChunkedUploadSession,
  restoreClaimedUploadSession,
  type ClaimedChunkedUpload,
} from '@/lib/chunked-upload';
import {
  cleanText,
  MAX_GALLERY_FILES,
  MAX_MOD_METADATA_REQUEST_BYTES,
  parseAccessLevel,
  safeFileName,
  validateArchiveMetadata,
  validateImageFile,
} from '@/lib/security/upload-security';
import {
  consumeRateLimit,
  getClientIp,
  isSameOriginRequest,
} from '@/lib/security/request-security';
import { createSafeRedirectUrl } from '@/lib/production/url';
import {
  getManagedMediaDirectory,
  getManagedMediaFilePath,
  getManagedMediaUrl,
} from '@/lib/media-storage';
import { normalizeExternalDownloadUrl } from '@/lib/download-source';
import type { ModDownloadSource } from '@/lib/types';

const UPLOAD_WINDOW_MS = 10 * 60 * 1000;
const UPLOAD_ATTEMPT_LIMIT = 10;
const SUBMISSION_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const globalSubmissionLocks = globalThis as typeof globalThis & {
  __modUploadSubmissionLocks?: Map<string, Promise<void>>;
};

const submissionLocks =
  globalSubmissionLocks.__modUploadSubmissionLocks ??
  new Map<string, Promise<void>>();

globalSubmissionLocks.__modUploadSubmissionLocks = submissionLocks;

async function withSubmissionLock<T>(
  key: string,
  operation: () => Promise<T>,
): Promise<T> {
  const previous = submissionLocks.get(key) ?? Promise.resolve();
  let release!: () => void;
  const current = new Promise<void>((resolve) => {
    release = resolve;
  });
  const queued = previous.then(() => current);

  submissionLocks.set(key, queued);
  await previous;

  try {
    return await operation();
  } finally {
    release();

    if (submissionLocks.get(key) === queued) {
      submissionLocks.delete(key);
    }
  }
}

function slugify(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function wantsJson(request: Request): boolean {
  return (
    request.headers.get('x-requested-with') === 'XMLHttpRequest' ||
    (request.headers.get('accept') ?? '').includes('application/json')
  );
}

function withResponseHeaders(
  response: NextResponse,
  requestId: string,
): NextResponse {
  response.headers.set('Cache-Control', 'no-store');
  response.headers.set('X-Request-Id', requestId);
  return response;
}

function uploadRedirect(
  request: Request,
  requestId: string,
  error?: string,
) {
  const url = createSafeRedirectUrl('/mods/upload', request);
  url.searchParams.set(error ? 'error' : 'ok', '1');

  return withResponseHeaders(
    NextResponse.redirect(url, 303),
    requestId,
  );
}

function uploadError(
  request: Request,
  requestId: string,
  message: string,
  status = 400,
) {
  if (wantsJson(request)) {
    return withResponseHeaders(
      NextResponse.json(
        {
          ok: false,
          message,
          requestId,
        },
        { status },
      ),
      requestId,
    );
  }

  return uploadRedirect(request, requestId, '1');
}

function uploadSuccess(
  request: Request,
  requestId: string,
  mod: { id: string; slug: string },
) {
  if (wantsJson(request)) {
    return withResponseHeaders(
      NextResponse.json({
        ok: true,
        modId: mod.id,
        slug: mod.slug,
        requestId,
      }),
      requestId,
    );
  }

  return uploadRedirect(request, requestId);
}

function boundedPosition(value: FormDataEntryValue | null): number {
  const parsed = Number(value ?? 50);

  return Number.isFinite(parsed)
    ? Math.min(100, Math.max(0, parsed))
    : 50;
}

function clientSubmissionId(
  value: FormDataEntryValue | null,
): string {
  const parsed = cleanText(value, 80);

  return SUBMISSION_ID_PATTERN.test(parsed)
    ? parsed.toLowerCase()
    : crypto.randomUUID();
}

function errorCode(error: unknown): string {
  return typeof error === 'object' &&
    error !== null &&
    'code' in error
    ? String(error.code)
    : '';
}

function publicUploadError(error: unknown): {
  message: string;
  status: number;
} {
  const code = errorCode(error);

  if (code === 'EPERM' || code === 'EBUSY' || code === 'EACCES') {
    return {
      message:
        'Windows đang tạm khóa file dữ liệu. Hệ thống chưa hoàn tất đăng mod; vui lòng thử lại sau ít giây.',
      status: 503,
    };
  }

  return {
    message:
      error instanceof Error
        ? error.message
        : 'Không thể đăng mod. Hãy kiểm tra dữ liệu và file.',
    status: 400,
  };
}

export async function POST(request: Request) {
  const requestId = crypto.randomUUID();

  try {
    if (!isSameOriginRequest(request)) {
      return uploadError(
        request,
        requestId,
        'Yêu cầu không hợp lệ.',
        403,
      );
    }

    const user = await requireCreator();

    if (!user) {
      return uploadError(
        request,
        requestId,
        'Bạn không có quyền đăng mod.',
        403,
      );
    }

    const contentLength = Number(
      request.headers.get('content-length') ?? 0,
    );

    if (
      Number.isFinite(contentLength) &&
      contentLength > MAX_MOD_METADATA_REQUEST_BYTES
    ) {
      return uploadError(
        request,
        requestId,
        'Ảnh bìa, gallery hoặc dữ liệu biểu mẫu vượt giới hạn.',
        413,
      );
    }

    const rateLimit = consumeRateLimit({
      key: `mod-upload:${user.id}:${getClientIp(request)}`,
      limit: UPLOAD_ATTEMPT_LIMIT,
      windowMs: UPLOAD_WINDOW_MS,
    });

    if (!rateLimit.allowed) {
      const response = uploadError(
        request,
        requestId,
        'Bạn thao tác quá nhanh. Vui lòng thử lại sau.',
        429,
      );
      response.headers.set(
        'Retry-After',
        String(rateLimit.retryAfterSeconds),
      );
      return response;
    }

    const formData = await request.formData();
    const submissionId = clientSubmissionId(
      formData.get('clientSubmissionId'),
    );
    const submissionKey = `${user.id}:${submissionId}`;

    return await withSubmissionLock(submissionKey, async () => {
      const existingMods = await getMods();
      const existingMod = existingMods.find(
        (mod) =>
          mod.authorId === user.id &&
          mod.clientSubmissionId === submissionId,
      );

      if (existingMod) {
        console.info(
          `[${requestId}] Reused completed mod submission ${submissionId}.`,
        );
        return uploadSuccess(
          request,
          requestId,
          existingMod,
        );
      }

      const writtenFiles: string[] = [];
      let claimedUpload: ClaimedChunkedUpload | null = null;
      let claimedUploadMovedTo = '';

      try {
        const downloadSource: ModDownloadSource =
          formData.get('downloadSource') === 'EXTERNAL'
            ? 'EXTERNAL'
            : 'LOCAL';
        const uploadSessionId = cleanText(
          formData.get('uploadSessionId'),
          80,
        );
        const externalDownloadUrl =
          downloadSource === 'EXTERNAL'
            ? normalizeExternalDownloadUrl(
                formData.get('externalDownloadUrl'),
              )
            : undefined;
        const cover = formData.get('cover');
        const galleryFiles = formData
          .getAll('gallery')
          .filter(
            (entry): entry is File =>
              entry instanceof File && entry.size > 0,
          );

        if (downloadSource === 'LOCAL' && !uploadSessionId) {
          throw new Error(
            'Thiếu phiên tải file mod. Hãy tải lại trang và thử lại.',
          );
        }

        if (!(cover instanceof File)) {
          throw new Error('Thiếu ảnh bìa.');
        }

        await validateImageFile(cover, 'Ảnh bìa');

        if (galleryFiles.length > MAX_GALLERY_FILES) {
          throw new Error(
            `Chỉ được tải tối đa ${MAX_GALLERY_FILES} ảnh preview.`,
          );
        }

        for (const [index, galleryFile] of galleryFiles.entries()) {
          await validateImageFile(
            galleryFile,
            `Ảnh preview ${index + 1}`,
          );
        }

        const title = cleanText(formData.get('title'), 120);

        if (title.length < 2) {
          throw new Error('Tên mod không hợp lệ.');
        }

        const coverPositionX = boundedPosition(
          formData.get('coverPositionX'),
        );
        const coverPositionY = boundedPosition(
          formData.get('coverPositionY'),
        );

        const coverDirectory = getManagedMediaDirectory('covers');
        const galleryDirectory = getManagedMediaDirectory('gallery');
        const uploadDirectory = path.join(
          process.cwd(),
          'storage',
          'uploads',
        );

        await Promise.all([
          fs.mkdir(coverDirectory, { recursive: true }),
          fs.mkdir(galleryDirectory, { recursive: true }),
          fs.mkdir(uploadDirectory, { recursive: true }),
        ]);

        const storedCoverName =
          `${crypto.randomUUID()}-${safeFileName(cover.name)}`;
        const storedCoverPath = getManagedMediaFilePath(
          'covers',
          storedCoverName,
        );

        await fs.writeFile(
          storedCoverPath,
          Buffer.from(await cover.arrayBuffer()),
          { flag: 'wx' },
        );
        writtenFiles.push(storedCoverPath);

        const galleryUrls: string[] = [];

        for (const galleryFile of galleryFiles) {
          const storedGalleryName =
            `${crypto.randomUUID()}-${safeFileName(galleryFile.name)}`;
          const storedGalleryPath = getManagedMediaFilePath(
            'gallery',
            storedGalleryName,
          );

          await fs.writeFile(
            storedGalleryPath,
            Buffer.from(await galleryFile.arrayBuffer()),
            { flag: 'wx' },
          );
          writtenFiles.push(storedGalleryPath);
          galleryUrls.push(
            getManagedMediaUrl('gallery', storedGalleryName),
          );
        }

        let fileName = 'Liên kết tải ngoài';
        let storedFileName = '';
        let fileSize = 0;

        if (downloadSource === 'LOCAL') {
          claimedUpload = await claimChunkedUploadSession({
            sessionId: uploadSessionId,
            userId: user.id,
          });

          validateArchiveMetadata(
            claimedUpload.originalFileName,
            claimedUpload.totalBytes,
          );

          storedFileName =
            `${crypto.randomUUID()}-${claimedUpload.safeOriginalFileName}`;
          const storedFilePath = path.join(
            uploadDirectory,
            storedFileName,
          );

          await fs.rename(claimedUpload.payloadPath, storedFilePath);
          claimedUploadMovedTo = storedFilePath;
          writtenFiles.push(storedFilePath);
          fileName = claimedUpload.safeOriginalFileName;
          fileSize = claimedUpload.totalBytes;
        }

        const now = new Date().toISOString();
        const mods = existingMods;
        const previousMods = [...mods];
        const baseSlug = slugify(title) || 'mod';

        let slug = baseSlug;
        let suffix = 2;

        while (mods.some((mod) => mod.slug === slug)) {
          slug = `${baseSlug}-${suffix++}`;
        }

        const newMod = {
          id: crypto.randomUUID(),
          title,
          slug,
          game: cleanText(formData.get('game'), 80),
          category: cleanText(formData.get('category'), 80),
          version: cleanText(formData.get('version'), 40),
          gameVersion: cleanText(formData.get('gameVersion'), 40),
          authorId: user.id,
          author: cleanText(formData.get('author'), 80) || user.name,
          description: cleanText(formData.get('description'), 20_000),
          installation: cleanText(formData.get('installation'), 20_000),
          accessLevel: parseAccessLevel(formData.get('accessLevel')),
          fileName,
          storedFileName,
          fileSize,
          downloadSource,
          externalDownloadUrl,
          clientSubmissionId: submissionId,
          coverUrl: getManagedMediaUrl('covers', storedCoverName),
          coverPositionX,
          coverPositionY,
          galleryUrls,
          downloads: 0,
          createdAt: now,
          updatedAt: now,
        };

        mods.unshift(newMod);
        await saveMods(mods);

        try {
          await rewardModPublished(user.id, newMod.id);
          await rewardModApprovedReputation(user.id, newMod.id);
        } catch (rewardError) {
          await Promise.allSettled([
            revokeModPublished(user.id, newMod.id),
            revokeModApprovedReputation(user.id, newMod.id),
          ]);
          await saveMods(previousMods);
          throw rewardError;
        }

        try {
          const notificationCount =
            await createModPublishedNotifications(
              user.id,
              newMod,
            );

          console.info(
            `[${requestId}] Created ${notificationCount} new-mod notifications.`,
          );
        } catch (notificationError) {
          console.error(
            `[${requestId}] Mod saved, but notification creation failed:`,
            notificationError,
          );
        }

        if (claimedUpload) {
          try {
            await removeChunkedUploadSession({
              sessionId: claimedUpload.sessionId,
              userId: user.id,
              allowConsuming: true,
            });
          } catch (cleanupError) {
            console.error(
              `[${requestId}] Mod saved, but upload session cleanup failed:`,
              cleanupError,
            );
          }
        }

        return uploadSuccess(request, requestId, newMod);
      } catch (error) {
        console.error(`[${requestId}] Mod upload failed:`, error);

        if (claimedUpload) {
          try {
            await restoreClaimedUploadSession({
              sessionId: claimedUpload.sessionId,
              userId: user.id,
              sourcePath: claimedUploadMovedTo || undefined,
            });
          } catch (restoreError) {
            console.error(
              `[${requestId}] Could not restore claimed upload session:`,
              restoreError,
            );

            if (claimedUploadMovedTo) {
              await fs.unlink(claimedUploadMovedTo).catch(() => undefined);
            }

            await removeChunkedUploadSession({
              sessionId: claimedUpload.sessionId,
              userId: user.id,
              allowConsuming: true,
            }).catch(() => undefined);
          }
        }

        await Promise.allSettled(
          writtenFiles
            .filter((filePath) => filePath !== claimedUploadMovedTo)
            .map((filePath) => fs.unlink(filePath)),
        );

        const publicError = publicUploadError(error);
        return uploadError(
          request,
          requestId,
          publicError.message,
          publicError.status,
        );
      }
    });
  } catch (error) {
    console.error(`[${requestId}] Unhandled mod upload failure:`, error);

    const publicError = publicUploadError(error);
    return uploadError(
      request,
      requestId,
      publicError.message,
      Math.max(500, publicError.status),
    );
  }
}
