import fs from 'node:fs/promises';
import path from 'node:path';
import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { canManageMod } from '@/lib/permissions';
import { getModById } from '@/lib/mods';
import {
  deleteModVersion,
  getVersionById,
} from '@/lib/mod-versions';

export async function DELETE(
  _request: Request,
  {
    params,
  }: {
    params: Promise<{
      id: string;
      versionId: string;
    }>;
  },
) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json(
      { ok: false },
      { status: 401 },
    );
  }

  const { id, versionId } =
    await params;
  const mod = await getModById(id);
  const version =
    await getVersionById(versionId);

  if (
    !mod ||
    !version ||
    version.modId !== mod.id
  ) {
    return NextResponse.json(
      { ok: false },
      { status: 404 },
    );
  }

  if (
    !canManageMod(user, mod)
  ) {
    return NextResponse.json(
      { ok: false },
      { status: 403 },
    );
  }

  const deleted =
    await deleteModVersion(
      versionId,
      mod.id,
    );

  if (!deleted) {
    return NextResponse.json(
      {
        ok: false,
        message:
          'Không thể xóa phiên bản hiện tại.',
      },
      { status: 400 },
    );
  }

  try {
    await fs.unlink(
      path.join(
        process.cwd(),
        'storage',
        'uploads',
        version.storedFileName,
      ),
    );
  } catch {
    // File có thể đã được xóa thủ công.
  }

  return NextResponse.json({
    ok: true,
  });
}
