import fs from 'node:fs/promises';
import path from 'node:path';
import { NextResponse } from 'next/server';

import { getCurrentUser } from '@/lib/auth';
import { canManageMod } from '@/lib/permissions';
import { getAppBaseUrl } from '@/lib/production/url';
import {
  getManagedMediaDirectory,
  getManagedMediaFilePath,
  getManagedMediaUrl,
  resolveManagedMediaUrl,
} from '@/lib/media-storage';
import {
  MAX_GALLERY_FILES,
  MAX_MOD_FILE_BYTES,
  safeFileName,
  validateImageFile,
} from '@/lib/security/upload-security';
import {
  getModById,
  getMods,
  saveMods,
} from '@/lib/store';

function slugify(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function clampPosition(
  value: FormDataEntryValue | null,
): number {
  const numericValue = Number(value ?? 50);

  if (!Number.isFinite(numericValue)) {
    return 50;
  }

  return Math.min(100, Math.max(0, numericValue));
}

async function removeFileIfExists(
  filePath: string,
): Promise<void> {
  try {
    await fs.unlink(filePath);
  } catch {
    // Không làm API lỗi nếu file đã không còn tồn tại.
  }
}

export async function POST(
  request: Request,
  {
    params,
  }: {
    params: Promise<{
      id: string;
    }>;
  },
) {
  const user = await getCurrentUser();

  if (!user) {
    return new Response('Unauthorized', {
      status: 401,
    });
  }

  const { id } = await params;
  const currentMod = await getModById(id);

  if (!currentMod) {
    return new Response('Mod not found', {
      status: 404,
    });
  }

  if (!canManageMod(user, currentMod)) {
    return new Response('Forbidden', {
      status: 403,
    });
  }

  const newlyWrittenPaths: string[] = [];
  const oldPathsToRemove: string[] = [];

  try {
    const formData = await request.formData();
    const mods = await getMods();

    const targetIndex = mods.findIndex(
      (mod) => mod.id === id,
    );

    if (targetIndex === -1) {
      return new Response('Mod not found', {
        status: 404,
      });
    }

    const title = String(
      formData.get('title') ?? '',
    ).trim();
    const game = String(
      formData.get('game') ?? '',
    ).trim();
    const category = String(
      formData.get('category') ?? '',
    ).trim();
    const version = String(
      formData.get('version') ?? '',
    ).trim();
    const gameVersion = String(
      formData.get('gameVersion') ?? '',
    ).trim();
    const author = String(
      formData.get('author') ?? '',
    ).trim();
    const description = String(
      formData.get('description') ?? '',
    ).trim();
    const installation = String(
      formData.get('installation') ?? '',
    ).trim();
    const accessLevel = String(
      formData.get('accessLevel') ?? 'PUBLIC',
    ) as 'PUBLIC' | 'MEMBER' | 'VIP';

    if (
      !title ||
      !game ||
      !category ||
      !version ||
      !gameVersion ||
      !author ||
      !description ||
      !installation
    ) {
      throw new Error('Missing required fields');
    }

    if (
      !['PUBLIC', 'MEMBER', 'VIP'].includes(accessLevel)
    ) {
      throw new Error('Invalid access level');
    }

    let slug = currentMod.slug;

    if (title !== currentMod.title) {
      const baseSlug = slugify(title) || 'mod';
      slug = baseSlug;
      let suffix = 2;

      while (
        mods.some(
          (mod) => mod.id !== id && mod.slug === slug,
        )
      ) {
        slug = `${baseSlug}-${suffix++}`;
      }
    }

    let coverUrl = currentMod.coverUrl;
    let fileName = currentMod.fileName;
    let storedFileName = currentMod.storedFileName;
    let fileSize = currentMod.fileSize;
    let galleryUrls = Array.isArray(currentMod.galleryUrls)
      ? [...currentMod.galleryUrls]
      : [];

    const coverPositionX = clampPosition(
      formData.get('coverPositionX'),
    );
    const coverPositionY = clampPosition(
      formData.get('coverPositionY'),
    );

    const newCover = formData.get('cover');

    if (newCover instanceof File && newCover.size > 0) {
      await validateImageFile(newCover, 'Ảnh bìa');

      const storedCoverName =
        `${crypto.randomUUID()}-${safeFileName(newCover.name)}`;
      const coverDirectory = getManagedMediaDirectory('covers');
      const newCoverPath = getManagedMediaFilePath(
        'covers',
        storedCoverName,
      );

      await fs.mkdir(coverDirectory, {
        recursive: true,
      });
      await fs.writeFile(
        newCoverPath,
        Buffer.from(await newCover.arrayBuffer()),
      );
      newlyWrittenPaths.push(newCoverPath);

      const oldCoverPath = resolveManagedMediaUrl(
        currentMod.coverUrl,
      );

      if (oldCoverPath) {
        oldPathsToRemove.push(oldCoverPath);
      }

      coverUrl = getManagedMediaUrl('covers', storedCoverName);
    }

    const galleryUpdateIntent =
      formData.get('galleryUpdateIntent') === '1';

    if (galleryUpdateIntent) {
      const currentGalleryUrls = Array.isArray(
        currentMod.galleryUrls,
      )
        ? currentMod.galleryUrls
        : [];
      const currentGallerySet = new Set(currentGalleryUrls);
      const keptGalleryUrls = Array.from(
        new Set(
          formData
            .getAll('existingGalleryUrls')
            .map((value) => String(value))
            .filter((url) => currentGallerySet.has(url)),
        ),
      );
      const newGalleryFiles = formData
        .getAll('gallery')
        .filter(
          (value): value is File =>
            value instanceof File && value.size > 0,
        );

      if (
        keptGalleryUrls.length + newGalleryFiles.length >
        MAX_GALLERY_FILES
      ) {
        throw new Error(
          `Chỉ được lưu tối đa ${MAX_GALLERY_FILES} ảnh preview.`,
        );
      }

      const galleryDirectory = getManagedMediaDirectory('gallery');
      const addedGalleryUrls: string[] = [];

      if (newGalleryFiles.length > 0) {
        await fs.mkdir(galleryDirectory, {
          recursive: true,
        });
      }

      for (const [index, galleryFile] of newGalleryFiles.entries()) {
        await validateImageFile(
          galleryFile,
          `Ảnh preview ${index + 1}`,
        );

        const storedGalleryName =
          `${crypto.randomUUID()}-${safeFileName(galleryFile.name)}`;
        const galleryPath = getManagedMediaFilePath(
          'gallery',
          storedGalleryName,
        );

        await fs.writeFile(
          galleryPath,
          Buffer.from(await galleryFile.arrayBuffer()),
        );
        newlyWrittenPaths.push(galleryPath);
        addedGalleryUrls.push(
          getManagedMediaUrl('gallery', storedGalleryName),
        );
      }

      galleryUrls = [
        ...keptGalleryUrls,
        ...addedGalleryUrls,
      ];

      currentGalleryUrls
        .filter((url) => !keptGalleryUrls.includes(url))
        .forEach((url) => {
          const oldGalleryPath = resolveManagedMediaUrl(url);

          if (oldGalleryPath) {
            oldPathsToRemove.push(oldGalleryPath);
          }
        });
    }

    const newModFile = formData.get('file');

    if (newModFile instanceof File && newModFile.size > 0) {
      if (newModFile.size > MAX_MOD_FILE_BYTES) {
        throw new Error('File too large');
      }

      const newStoredFileName =
        `${crypto.randomUUID()}-${safeFileName(newModFile.name)}`;
      const uploadDirectory = path.join(
        process.cwd(),
        'storage',
        'uploads',
      );
      const newModPath = path.join(
        uploadDirectory,
        newStoredFileName,
      );

      await fs.mkdir(uploadDirectory, {
        recursive: true,
      });
      await fs.writeFile(
        newModPath,
        Buffer.from(await newModFile.arrayBuffer()),
      );
      newlyWrittenPaths.push(newModPath);

      oldPathsToRemove.push(
        path.join(
          process.cwd(),
          'storage',
          'uploads',
          currentMod.storedFileName,
        ),
      );

      fileName = newModFile.name;
      storedFileName = newStoredFileName;
      fileSize = newModFile.size;
    }

    mods[targetIndex] = {
      ...currentMod,
      title,
      slug,
      game,
      category,
      version,
      gameVersion,
      author,
      description,
      installation,
      accessLevel,
      fileName,
      storedFileName,
      fileSize,
      coverUrl,
      coverPositionX,
      coverPositionY,
      galleryUrls,
      updatedAt: new Date().toISOString(),
    };

    await saveMods(mods);

    await Promise.all(
      oldPathsToRemove.map((filePath) =>
        removeFileIfExists(filePath),
      ),
    );

    return NextResponse.redirect(
      new URL(
        '/admin/mods?updated=1',
        getAppBaseUrl(request),
      ),
      303,
    );
  } catch (error) {
    await Promise.all(
      newlyWrittenPaths.map((filePath) =>
        removeFileIfExists(filePath),
      ),
    );

    console.error('Lỗi cập nhật mod:', error);

    return NextResponse.redirect(
      new URL(
        `/admin/mods/${id}/edit?error=1`,
        getAppBaseUrl(request),
      ),
      303,
    );
  }
}
