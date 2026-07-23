import fs from 'node:fs/promises';
import path from 'node:path';
import { NextResponse } from 'next/server';
import { requireCreator } from '@/lib/auth';
import { getMods, saveMods } from '@/lib/store';
import { createModPublishedNotifications } from '@/lib/notifications';
import {
  cleanText,
  MAX_GALLERY_FILES,
  MAX_UPLOAD_REQUEST_BYTES,
  parseAccessLevel,
  safeFileName,
  validateArchiveFile,
  validateImageFile,
} from '@/lib/security/upload-security';
import {
  consumeRateLimit,
  getClientIp,
  isSameOriginRequest,
} from '@/lib/security/request-security';


import { createSafeRedirectUrl } from '@/lib/production/url';
const UPLOAD_WINDOW_MS = 10 * 60 * 1000;
const UPLOAD_ATTEMPT_LIMIT = 10;

function slugify(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function uploadRedirect(request: Request, error?: string) {
  const url = createSafeRedirectUrl('/mods/upload', request);
  url.searchParams.set(error ? 'error' : 'ok', '1');

  const response = NextResponse.redirect(url, 303);
  response.headers.set('Cache-Control', 'no-store');
  return response;
}

function boundedPosition(value: FormDataEntryValue | null): number {
  const parsed = Number(value ?? 50);

  return Number.isFinite(parsed)
    ? Math.min(100, Math.max(0, parsed))
    : 50;
}

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) {
    return new Response('Forbidden', { status: 403 });
  }

  const user = await requireCreator();

  if (!user) {
    return new Response('Forbidden', { status: 403 });
  }

  const contentLength = Number(
    request.headers.get('content-length') ?? 0,
  );

  if (
    Number.isFinite(contentLength) &&
    contentLength > MAX_UPLOAD_REQUEST_BYTES
  ) {
    return new Response('Payload Too Large', { status: 413 });
  }

  const rateLimit = consumeRateLimit({
    key: `mod-upload:${user.id}:${getClientIp(request)}`,
    limit: UPLOAD_ATTEMPT_LIMIT,
    windowMs: UPLOAD_WINDOW_MS,
  });

  if (!rateLimit.allowed) {
    const response = uploadRedirect(request, 'rate-limit');
    response.headers.set(
      'Retry-After',
      String(rateLimit.retryAfterSeconds),
    );
    return response;
  }

  const writtenFiles: string[] = [];

  try {
    const formData = await request.formData();

    const file = formData.get('file');
    const cover = formData.get('cover');
    const galleryFiles = formData
      .getAll('gallery')
      .filter(
        (entry): entry is File =>
          entry instanceof File && entry.size > 0,
      );

    if (!(file instanceof File)) {
      throw new Error('Thiếu file mod.');
    }

    if (!(cover instanceof File)) {
      throw new Error('Thiếu ảnh bìa.');
    }

    validateArchiveFile(file);
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

    const coverDirectory = path.join(
      process.cwd(),
      'public',
      'uploads',
      'covers',
    );
    const galleryDirectory = path.join(
      process.cwd(),
      'public',
      'uploads',
      'gallery',
    );
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
    const storedCoverPath = path.join(
      coverDirectory,
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
      const storedGalleryPath = path.join(
        galleryDirectory,
        storedGalleryName,
      );

      await fs.writeFile(
        storedGalleryPath,
        Buffer.from(await galleryFile.arrayBuffer()),
        { flag: 'wx' },
      );
      writtenFiles.push(storedGalleryPath);
      galleryUrls.push(
        `/uploads/gallery/${storedGalleryName}`,
      );
    }

    const storedFileName =
      `${crypto.randomUUID()}-${safeFileName(file.name)}`;
    const storedFilePath = path.join(
      uploadDirectory,
      storedFileName,
    );

    await fs.writeFile(
      storedFilePath,
      Buffer.from(await file.arrayBuffer()),
      { flag: 'wx' },
    );
    writtenFiles.push(storedFilePath);

    const now = new Date().toISOString();
    const mods = await getMods();
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
      accessLevel: parseAccessLevel(
        formData.get('accessLevel'),
      ),
      fileName: safeFileName(file.name),
      storedFileName,
      fileSize: file.size,
      coverUrl: `/uploads/covers/${storedCoverName}`,
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
      const notificationCount =
        await createModPublishedNotifications(
          user.id,
          newMod,
        );

      console.info(
        `Created ${notificationCount} new-mod notifications.`,
      );
    } catch (notificationError) {
      console.error(
        'Mod saved, but notification creation failed:',
        notificationError,
      );
    }

    return uploadRedirect(request);
  } catch (error) {
    console.error('Mod upload failed:', error);

    await Promise.allSettled(
      writtenFiles.map((filePath) => fs.unlink(filePath)),
    );

    return uploadRedirect(request, '1');
  }
}
