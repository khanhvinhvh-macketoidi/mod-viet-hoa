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
} from '@/lib/mod-versions';
import {
  createNotification,
} from '@/lib/notifications';
import { getFollowerIds } from '@/lib/follows';

const MAX_FILE_SIZE =
  500 * 1024 * 1024;

function safeFileName(value: string): string {
  return value.replace(
    /[^a-zA-Z0-9._-]/g,
    '_',
  );
}

export async function POST(
  request: Request,
  {
    params,
  }: {
    params: Promise<{ id: string }>;
  },
) {
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
        message:
          'Bạn không có quyền phát hành mod này.',
      },
      { status: 403 },
    );
  }

  const formData =
    await request.formData();
  const version = String(
    formData.get('version') ?? '',
  ).trim();
  const gameVersion = String(
    formData.get('gameVersion') ?? '',
  ).trim();
  const changelog = String(
    formData.get('changelog') ?? '',
  ).trim();
  const file = formData.get('file');

  if (
    !version ||
    !gameVersion ||
    !changelog ||
    !(file instanceof File) ||
    file.size <= 0
  ) {
    return NextResponse.json(
      {
        ok: false,
        message:
          'Vui lòng nhập đủ thông tin và chọn file.',
      },
      { status: 400 },
    );
  }

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json(
      {
        ok: false,
        message:
          'File vượt quá giới hạn 500 MB.',
      },
      { status: 400 },
    );
  }

  await ensureCurrentVersion(
    mod,
    user.id,
  );

  const storedFileName =
    `${randomUUID()}-${safeFileName(
      file.name,
    )}`;

  const uploadDirectory = path.join(
    process.cwd(),
    'storage',
    'uploads',
  );

  await fs.mkdir(uploadDirectory, {
    recursive: true,
  });

  await fs.writeFile(
    path.join(
      uploadDirectory,
      storedFileName,
    ),
    Buffer.from(
      await file.arrayBuffer(),
    ),
  );

  const release = await createModVersion({
    modId: mod.id,
    version,
    gameVersion,
    changelog,
    fileName: file.name,
    storedFileName,
    fileSize: file.size,
    createdByUserId: user.id,
  });

  const mods = await getMods();
  const now = new Date().toISOString();

  await saveMods(
    mods.map((item) =>
      item.id === mod.id
        ? {
            ...item,
            version,
            gameVersion,
            fileName: file.name,
            storedFileName,
            fileSize: file.size,
            updatedAt: now,
          }
        : item,
    ),
  );

  if (mod.authorId) {
    const followerIds =
      await getFollowerIds(mod.authorId);

    for (const followerId of followerIds) {
      if (followerId === mod.authorId) {
        continue;
      }

      await createNotification({
        userId: followerId,
        type: 'MOD_UPDATED',
        title: `${mod.title} có phiên bản ${version}`,
        message:
          changelog.slice(0, 220),
        href: `/mods/${mod.slug}`,
        actorUserId: mod.authorId,
        relatedModId: mod.id,
        dedupeKey:
          `mod-version:${release.id}:${followerId}`,
      });
    }
  }

  return NextResponse.json({
    ok: true,
    version: release,
  });
}
