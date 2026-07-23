import fs from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getUsers, saveUsers } from '@/lib/users';

const MIME_EXTENSIONS: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};

function isAllowedUploadPath(
  publicUrl: string | undefined,
  expectedFolder: string,
): boolean {
  return Boolean(
    publicUrl &&
      publicUrl.startsWith(`/uploads/${expectedFolder}/`) &&
      !publicUrl.includes('..'),
  );
}

async function removeOldUpload(
  publicUrl: string | undefined,
  expectedFolder: string,
): Promise<void> {
  if (!isAllowedUploadPath(publicUrl, expectedFolder)) {
    return;
  }

  const relativePath = publicUrl!.replace(/^\/+/, '');
  const absolutePath = path.join(process.cwd(), 'public', relativePath);

  try {
    await fs.unlink(absolutePath);
  } catch (error) {
    if (
      error instanceof Error &&
      'code' in error &&
      error.code === 'ENOENT'
    ) {
      return;
    }

    console.warn('Không thể xóa ảnh cũ:', error);
  }
}

async function saveImageUpload(
  file: File,
  folder: string,
  maxBytes: number,
): Promise<string> {
  const extension = MIME_EXTENSIONS[file.type];

  if (!extension) {
    throw new Error('Chỉ chấp nhận ảnh JPG, PNG hoặc WebP.');
  }

  if (file.size <= 0) {
    throw new Error('File ảnh trống.');
  }

  if (file.size > maxBytes) {
    throw new Error(
      `Dung lượng ảnh không được vượt quá ${Math.round(
        maxBytes / 1024 / 1024,
      )} MB.`,
    );
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const uploadDir = path.join(
    process.cwd(),
    'public',
    'uploads',
    folder,
  );

  await fs.mkdir(uploadDir, { recursive: true });

  const fileName = `${Date.now()}-${randomUUID()}${extension}`;
  const absolutePath = path.join(uploadDir, fileName);

  await fs.writeFile(absolutePath, bytes);

  return `/uploads/${folder}/${fileName}`;
}export async function POST(request: Request) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return NextResponse.json(
      { ok: false, message: 'Đạo hữu cần đăng nhập.' },
      { status: 401 },
    );
  }

  let newCover: string | null = null;

  try {
    const formData = await request.formData();
    const file = formData.get('file');

    if (!(file instanceof File)) {
      return NextResponse.json(
        { ok: false, message: 'Không tìm thấy file ảnh.' },
        { status: 400 },
      );
    }

    newCover = await saveImageUpload(
      file,
      'profile-covers',
      10 * 1024 * 1024,
    );

    const users = await getUsers();
    const userIndex = users.findIndex(
      (user) => user.id === currentUser.id,
    );

    if (userIndex < 0) {
      throw new Error('Không tìm thấy tài khoản.');
    }

    const oldCover = users[userIndex].profile?.coverImage;
    const coverPosition = { x: 50, y: 50 };

    users[userIndex] = {
      ...users[userIndex],
      profile: {
        displayName:
          users[userIndex].profile?.displayName ||
          users[userIndex].name,
        ...users[userIndex].profile,
        coverImage: newCover,
        coverPosition,
      },
      updatedAt: new Date().toISOString(),
    };

    await saveUsers(users);
    await removeOldUpload(oldCover, 'profile-covers');

    return NextResponse.json({
      ok: true,
      message: 'Đã cập nhật ảnh bìa.',
      coverImage: newCover,
      coverPosition,
    });
  } catch (error) {
    if (newCover) {
      await removeOldUpload(newCover, 'profile-covers');
    }

    console.error('Không thể cập nhật cover:', error);

    return NextResponse.json(
      {
        ok: false,
        message:
          error instanceof Error
            ? error.message
            : 'Không thể cập nhật ảnh bìa.',
      },
      { status: 500 },
    );
  }
}

export async function DELETE() {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return NextResponse.json(
      { ok: false, message: 'Đạo hữu cần đăng nhập.' },
      { status: 401 },
    );
  }

  try {
    const users = await getUsers();
    const userIndex = users.findIndex(
      (user) => user.id === currentUser.id,
    );

    if (userIndex < 0) {
      return NextResponse.json(
        { ok: false, message: 'Không tìm thấy tài khoản.' },
        { status: 404 },
      );
    }

    const oldCover = users[userIndex].profile?.coverImage;

    users[userIndex] = {
      ...users[userIndex],
      profile: {
        displayName:
          users[userIndex].profile?.displayName ||
          users[userIndex].name,
        ...users[userIndex].profile,
        coverImage: undefined,
        coverPosition: { x: 50, y: 50 },
      },
      updatedAt: new Date().toISOString(),
    };

    await saveUsers(users);
    await removeOldUpload(oldCover, 'profile-covers');

    return NextResponse.json({
      ok: true,
      message: 'Đã xóa ảnh bìa.',
      coverImage: '',
      coverPosition: { x: 50, y: 50 },
    });
  } catch (error) {
    console.error('Không thể xóa cover:', error);

    return NextResponse.json(
      {
        ok: false,
        message:
          error instanceof Error
            ? error.message
            : 'Không thể xóa ảnh bìa.',
      },
      { status: 500 },
    );
  }
}
