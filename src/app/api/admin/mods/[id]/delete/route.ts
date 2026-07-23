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

async function removeFileIfExists(filePath: string): Promise<void> {
  try {
    await fs.unlink(filePath);
  } catch {
    // Không làm thao tác xóa thất bại nếu file đã không tồn tại.
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
  const mod = await getModById(id);

  if (!mod) {
    return NextResponse.redirect(
      new URL(user.role === 'ADMIN' ? '/admin/mods?error=1' : '/creator/mods?error=1', request.url),
      303,
    );
  }

  if (!canManageMod(user, mod)) {
    return new Response('Forbidden', { status: 403 });
  }

  try {
    const mods = await getMods();
    const remainingMods = mods.filter(
      (item) => item.id !== id,
    );

    /*
     * Lưu dữ liệu trước.
     * Sau đó mới xóa các file vật lý.
     */
    await saveMods(remainingMods);

    const modFilePath = path.join(
      process.cwd(),
      'storage',
      'uploads',
      mod.storedFileName,
    );

    await removeFileIfExists(modFilePath);

    if (mod.coverUrl?.startsWith('/uploads/covers/')) {
      const coverFilePath = path.join(
        process.cwd(),
        'public',
        mod.coverUrl.replace(/^\//, ''),
      );

      await removeFileIfExists(coverFilePath);
    }

    return NextResponse.redirect(
      new URL(user.role === 'ADMIN' ? '/admin/mods?deleted=1' : '/creator/mods?deleted=1', request.url),
      303,
    );
  } catch (error) {
    console.error('Lỗi xóa mod:', error);

    return NextResponse.redirect(
      new URL(user.role === 'ADMIN' ? '/admin/mods?error=1' : '/creator/mods?error=1', request.url),
      303,
    );
  }
}