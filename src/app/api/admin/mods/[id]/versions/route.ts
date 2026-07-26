import fs from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { canManageMod } from '@/lib/permissions';
import {
  getModById,
  getMods,
  saveMods,
} from '@/lib/mods';
import {
  createModVersion,
  ensureCurrentVersion,
  getModVersions,
  saveModVersions,
} from '@/lib/mod-versions';
import { createNotification } from '@/lib/notifications';
import { getFollowerIds } from '@/lib/follows';
import {
  claimChunkedUploadSession,
  removeChunkedUploadSession,
  restoreClaimedUploadSession,
  type ClaimedChunkedUpload,
} from '@/lib/chunked-upload';
import {
  cleanText,
  MAX_MOD_METADATA_REQUEST_BYTES,
  validateArchiveMetadata,
} from '@/lib/security/upload-security';
import { isSameOriginRequest } from '@/lib/security/request-security';
import { normalizeExternalDownloadUrl } from '@/lib/download-source';
import type { ModDownloadSource } from '@/lib/types';

export async function POST(
  request: Request,
  {
    params,
  }: {
    params: Promise<{ id: string }>;
  },
) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json(
      { ok: false, message: 'Yêu cầu không hợp lệ.' },
      { status: 403 },
    );
  }

  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json(
      {
        ok: false,
        message: 'Bạn chưa đăng nhập.',
      },
      { status: 401 },
    );
  }

  const contentLength = Number(
    request.headers.get('content-length') ?? 0,
  );

  if (
    Number.isFinite(contentLength) &&
    contentLength > MAX_MOD_METADATA_REQUEST_BYTES
  ) {
    return NextResponse.json(
      {
        ok: false,
        message: 'Dữ liệu phát hành vượt giới hạn request.',
      },
      { status: 413 },
    );
  }

  const { id } = await params;
  const mod = await getModById(id);

  if (!mod) {
    return NextResponse.json(
      {
        ok: false,
        message: 'Không tìm thấy mod.',
      },
      { status: 404 },
    );
  }

  if (!canManageMod(user, mod)) {
    return NextResponse.json(
      {
        ok: false,
        message: 'Bạn không có quyền phát hành mod này.',
      },
      { status: 403 },
    );
  }

  let claimedUpload: ClaimedChunkedUpload | null = null;
  let claimedUploadMovedTo = '';
  let previousCurrentVersionId = '';
  let createdReleaseId = '';
  let createdStoredFileName = '';
  let releaseUpdatedAt = '';

  try {
    const formData = await request.formData();
    const version = cleanText(formData.get('version'), 40);
    const gameVersion = cleanText(formData.get('gameVersion'), 40);
    const changelog = cleanText(formData.get('changelog'), 20_000);
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

    if (
      !version ||
      !gameVersion ||
      !changelog ||
      (downloadSource === 'LOCAL' && !uploadSessionId)
    ) {
      throw new Error(
        'Vui lòng nhập đủ thông tin và chọn nguồn tải phiên bản.',
      );
    }

    await ensureCurrentVersion(mod, user.id);

    const versionsBeforeRelease = await getModVersions();
    previousCurrentVersionId =
      versionsBeforeRelease.find(
        (item) => item.modId === mod.id && item.isCurrent,
      )?.id ?? '';

    let fileName = 'Liên kết tải ngoài';
    let storedFileName = '';
    let fileSize = 0;

    if (downloadSource === 'LOCAL') {
      const claimed = await claimChunkedUploadSession({
        sessionId: uploadSessionId,
        userId: user.id,
      });
      claimedUpload = claimed;

      validateArchiveMetadata(
        claimed.originalFileName,
        claimed.totalBytes,
      );

      const uploadDirectory = path.join(
        process.cwd(),
        'storage',
        'uploads',
      );
      storedFileName =
        `${randomUUID()}-${claimed.safeOriginalFileName}`;
      createdStoredFileName = storedFileName;
      const storedFilePath = path.join(
        uploadDirectory,
        storedFileName,
      );

      await fs.mkdir(uploadDirectory, { recursive: true });
      await fs.rename(claimed.payloadPath, storedFilePath);
      claimedUploadMovedTo = storedFilePath;
      fileName = claimed.originalFileName;
      fileSize = claimed.totalBytes;
    }

    const release = await createModVersion({
      modId: mod.id,
      version,
      gameVersion,
      changelog,
      fileName,
      storedFileName,
      fileSize,
      downloadSource,
      externalDownloadUrl,
      createdByUserId: user.id,
    });

    createdReleaseId = release.id;
    const now = new Date().toISOString();
    releaseUpdatedAt = now;
    const latestMods = await getMods();

    await saveMods(
      latestMods.map((item) =>
        item.id === mod.id
          ? {
              ...item,
              version,
              gameVersion,
              fileName,
              storedFileName,
              fileSize,
              downloadSource,
              externalDownloadUrl,
              updatedAt: now,
            }
          : item,
      ),
    );

    if (mod.authorId) {
      try {
        const followerIds = await getFollowerIds(mod.authorId);

        for (const followerId of followerIds) {
          if (followerId === mod.authorId) continue;

          await createNotification({
            userId: followerId,
            type: 'MOD_UPDATED',
            title: `${mod.title} có phiên bản ${version}`,
            message: changelog.slice(0, 220),
            href: `/mods/${mod.slug}`,
            actorUserId: mod.authorId,
            relatedModId: mod.id,
            dedupeKey: `mod-version:${release.id}:${followerId}`,
          });
        }
      } catch (notificationError) {
        console.error(
          'Version saved, but follower notifications failed:',
          notificationError,
        );
      }
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
          'Version saved, but upload session cleanup failed:',
          cleanupError,
        );
      }
    }

    return NextResponse.json({
      ok: true,
      version: release,
    });
  } catch (error) {
    console.error('Create mod version failed:', error);

    if (createdReleaseId) {
      const rollbackResults = await Promise.allSettled([
        (async () => {
          const latestVersions = await getModVersions();
          const remainingVersions = latestVersions.filter(
            (item) => item.id !== createdReleaseId,
          );
          const hasAnotherCurrentVersion = remainingVersions.some(
            (item) => item.modId === mod.id && item.isCurrent,
          );

          await saveModVersions(
            remainingVersions.map((item) =>
              item.modId === mod.id && !hasAnotherCurrentVersion
                ? {
                    ...item,
                    isCurrent: item.id === previousCurrentVersionId,
                  }
                : item,
            ),
          );
        })(),
        (async () => {
          const latestMods = await getMods();

          await saveMods(
            latestMods.map((item) =>
              item.id === mod.id &&
              item.updatedAt === releaseUpdatedAt &&
              item.storedFileName === createdStoredFileName
                ? {
                    ...item,
                    version: mod.version,
                    gameVersion: mod.gameVersion,
                    fileName: mod.fileName,
                    storedFileName: mod.storedFileName,
                    fileSize: mod.fileSize,
                    downloadSource: mod.downloadSource,
                    externalDownloadUrl: mod.externalDownloadUrl,
                    updatedAt: mod.updatedAt,
                  }
                : item,
            ),
          );
        })(),
      ]);

      for (const rollbackResult of rollbackResults) {
        if (rollbackResult.status === 'rejected') {
          console.error(
            'Could not rollback release metadata:',
            rollbackResult.reason,
          );
        }
      }
    }

    if (claimedUpload) {
      try {
        await restoreClaimedUploadSession({
          sessionId: claimedUpload.sessionId,
          userId: user.id,
          sourcePath: claimedUploadMovedTo || undefined,
        });
      } catch (restoreError) {
        console.error(
          'Could not restore version upload session:',
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

    return NextResponse.json(
      {
        ok: false,
        message:
          error instanceof Error
            ? error.message
            : 'Không thể phát hành phiên bản mới.',
      },
      { status: 400 },
    );
  }
}
