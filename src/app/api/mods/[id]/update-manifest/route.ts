import { NextResponse } from 'next/server';
import { getModById } from '@/lib/mods';
import {
  ensureCurrentVersion,
  getVersionsByModId,
} from '@/lib/mod-versions';
import { getDependenciesByModId } from '@/lib/mod-dependencies';

export async function GET(
  request: Request,
  {
    params,
  }: {
    params: Promise<{ id: string }>;
  },
) {
  const { id } = await params;
  const mod = await getModById(id);

  if (!mod) {
    return NextResponse.json(
      { ok: false },
      { status: 404 },
    );
  }

  await ensureCurrentVersion(mod);

  const [versions, dependencies] =
    await Promise.all([
      getVersionsByModId(mod.id),
      getDependenciesByModId(
        mod.id,
      ),
    ]);

  const latest = versions.find(
    (item) => item.isCurrent,
  );

  if (!latest) {
    return NextResponse.json(
      { ok: false },
      { status: 404 },
    );
  }

  const url = new URL(request.url);

  return NextResponse.json({
    ok: true,
    mod: {
      id: mod.id,
      slug: mod.slug,
      title: mod.title,
    },
    latest: {
      id: latest.id,
      version: latest.version,
      gameVersion:
        latest.gameVersion,
      changelog: latest.changelog,
      fileSize: latest.fileSize,
      publishedAt:
        latest.createdAt,
      downloadUrl:
        `${url.origin}/api/mods/${mod.id}/versions/${latest.id}/download`,
    },
    dependencies,
  });
}
