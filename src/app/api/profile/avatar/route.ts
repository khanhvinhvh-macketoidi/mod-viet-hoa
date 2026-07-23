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

  let newAvatar: string | null = null;

  try {
    const formData = await request.formData();
    const file = formData.get('file');

    if (!(file instanceof File)) {
      return NextResponse.json(
        { ok: false, message: 'Không tìm thấy file ảnh.' },
        { status: 400 },
      );
    }

    newAvatar = await saveImageUpload(
      file,
      'avatars',
      5 * 1024 * 1024,
    );

    const users = await getUsers();
    const userIndex = users.findIndex(
      (user) => user.id === currentUser.id,
    );

    if (userIndex < 0) {
      throw new Error('Không tìm thấy tài khoản.');
    }

    const oldAvatar = users[userIndex].profile?.avatar;

    users[userIndex] = {
      ...users[userIndex],
      profile: {
        displayName:
          users[userIndex].profile?.displayName ||
          users[userIndex].name,
        ...users[userIndex].profile,
        avatar: newAvatar,
      },
      updatedAt: new Date().toISOString(),
    };

    await saveUsers(users);
    await removeOldUpload(oldAvatar, 'avatars');

    return NextResponse.json({
      ok: true,
      message: 'Đã cập nhật ảnh đại diện.',
      avatar: newAvatar,
    });
  } catch (error) {
    if (newAvatar) {
      await removeOldUpload(newAvatar, 'avatars');
    }

    console.error('Không thể cập nhật avatar:', error);

    return NextResponse.json(
      {
        ok: false,
        message:
          error instanceof Error
            ? error.message
            : 'Không thể cập nhật ảnh đại diện.',
      },
      { status: 500 },
    );
  }
}
