import fs from 'node:fs/promises';
import path from 'node:path';
import { NextResponse } from 'next/server';

import { getCurrentUser } from '@/lib/auth';
import { canManageMod } from '@/lib/permissions';
import {
  getModById,
  getMods,
  saveMods,
} from '@/lib/store';

const MAX_COVER_SIZE = 10 * 1024 * 1024;
const MAX_MOD_SIZE = 200 * 1024 * 1024;

const ALLOWED_COVER_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
];

function slugify(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function clampPosition(value: FormDataEntryValue | null): number {
  const numericValue = Number(value ?? 50);

  if (!Number.isFinite(numericValue)) {
    return 50;
  }

  return Math.min(100, Math.max(0, numericValue));
}

async function removeFileIfExists(filePath: string): Promise<void> {
  try {
    await fs.unlink(filePath);
  } catch {
    // Không làm API lỗi nếu file cũ đã không còn tồn tại.
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
    return new Response('Unauthorized', { status: 401 });
  }

  const { id } = await params;
  const currentMod = await getModById(id);

  if (!currentMod) {
    return new Response('Mod not found', { status: 404 });
  }

  if (!canManageMod(user, currentMod)) {
    return new Response('Forbidden', { status: 403 });
  }

  try {
    const formData = await request.formData();
    const mods = await getMods();
    const targetIndex = mods.findIndex((mod) => mod.id === id);

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
          (mod) =>
            mod.id !== id &&
            mod.slug === slug,
        )
      ) {
        slug = `${baseSlug}-${suffix++}`;
      }
    }

    let coverUrl = currentMod.coverUrl;
    let fileName = currentMod.fileName;
    let storedFileName = currentMod.storedFileName;
    let fileSize = currentMod.fileSize;

    const coverPositionX = clampPosition(
      formData.get('coverPositionX'),
    );

    const coverPositionY = clampPosition(
      formData.get('coverPositionY'),
    );

    const newCover = formData.get('cover');

    if (
      newCover instanceof File &&
      newCover.size > 0
    ) {
      if (
        newCover.size > MAX_COVER_SIZE ||
        !ALLOWED_COVER_TYPES.includes(newCover.type)
      ) {
        throw new Error('Invalid cover');
      }

      const safeCoverName = newCover.name.replace(
        /[^a-zA-Z0-9._-]/g,
        '_',
      );

      const storedCoverName =
        `${crypto.randomUUID()}-${safeCoverName}`;

      const coverDirectory = path.join(
        process.cwd(),
        'public',
        'uploads',
        'covers',
      );

      await fs.mkdir(coverDirectory, {
        recursive: true,
      });

      await fs.writeFile(
        path.join(coverDirectory, storedCoverName),
        Buffer.from(await newCover.arrayBuffer()),
      );

      if (currentMod.coverUrl?.startsWith('/uploads/covers/')) {
        const oldCoverPath = path.join(
          process.cwd(),
          'public',
          currentMod.coverUrl.replace(/^\//, ''),
        );

        await removeFileIfExists(oldCoverPath);
      }

      coverUrl = `/uploads/covers/${storedCoverName}`;
    }

    const newModFile = formData.get('file');

    if (
      newModFile instanceof File &&
      newModFile.size > 0
    ) {
      if (newModFile.size > MAX_MOD_SIZE) {
        throw new Error('File too large');
      }

      const safeOriginalName = newModFile.name.replace(
        /[^a-zA-Z0-9._-]/g,
        '_',
      );

      const newStoredFileName =
        `${crypto.randomUUID()}-${safeOriginalName}`;

      const uploadDirectory = path.join(
        process.cwd(),
        'storage',
        'uploads',
      );

      await fs.mkdir(uploadDirectory, {
        recursive: true,
      });

      await fs.writeFile(
        path.join(uploadDirectory, newStoredFileName),
        Buffer.from(await newModFile.arrayBuffer()),
      );

      const oldModPath = path.join(
        process.cwd(),
        'storage',
        'uploads',
        currentMod.storedFileName,
      );

      await removeFileIfExists(oldModPath);

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
      updatedAt: new Date().toISOString(),
    };

    await saveMods(mods);

    return NextResponse.redirect(
      new URL('/admin/mods?updated=1', request.url),
      303,
    );
  } catch (error) {
    console.error('Lỗi cập nhật mod:', error);

    return NextResponse.redirect(
      new URL(
        `/admin/mods/${id}/edit?error=1`,
        request.url,
      ),
      303,
    );
  }
}