import fs from 'node:fs/promises';
import path from 'node:path';
import { getCurrentUser } from '@/lib/auth';
import {
  getModById,
  getMods,
  saveMods,
} from '@/lib/mods';
import {
  getVersionById,
  incrementVersionDownloads,
} from '@/lib/mod-versions';

export async function GET(
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
  const { id, versionId } =
    await params;
  const [mod, version, user] =
    await Promise.all([
      getModById(id),
      getVersionById(versionId),
      getCurrentUser(),
    ]);

  if (
    !mod ||
    !version ||
    version.modId !== mod.id
  ) {
    return new Response('Not found', {
      status: 404,
    });
  }

  const allowed =
    mod.accessLevel === 'PUBLIC' ||
    (
      mod.accessLevel === 'MEMBER' &&
      Boolean(user)
    ) ||
    (
      mod.accessLevel === 'VIP' &&
      Boolean(user?.isVip)
    ) ||
    user?.role === 'ADMIN';

  if (!allowed) {
    return new Response('Forbidden', {
      status: 403,
    });
  }

  const filePath = path.join(
    process.cwd(),
    'storage',
    'uploads',
    version.storedFileName,
  );

  let file: Buffer;

  try {
    file = await fs.readFile(filePath);
  } catch {
    return new Response(
      'File not found',
      {
        status: 404,
      },
    );
  }

  await incrementVersionDownloads(
    version.id,
  );

  const mods = await getMods();

  await saveMods(
    mods.map((item) =>
      item.id === mod.id
        ? {
            ...item,
            downloads:
              item.downloads + 1,
          }
        : item,
    ),
  );

  return new Response(
  new Uint8Array(file),
  {
    headers: {
      "Content-Type": "application/octet-stream",
      'Content-Disposition':
        `attachment; filename*=UTF-8''${encodeURIComponent(
          version.fileName,
        )}`,
      'Content-Length':
        String(file.byteLength),
    },
  });
}
