import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { canManageMod } from '@/lib/permissions';
import {
  getModById,
  getMods,
} from '@/lib/mods';
import { replaceModDependencies } from '@/lib/mod-dependencies';

export async function PUT(
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
      { ok: false },
      { status: 401 },
    );
  }

  const { id } = await params;
  const mod = await getModById(id);

  if (!mod) {
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

  const body = (await request.json()) as {
    dependencies?: Array<{
      dependencyModId?: string;
      externalName?: string;
      externalUrl?: string;
      type?: string;
      note?: string;
    }>;
  };

  const allMods = await getMods();
  const validIds = new Set(
    allMods.map((item) => item.id),
  );

  const normalized = (
    body.dependencies ?? []
  ).map((item) => ({
    dependencyModId:
      item.dependencyModId &&
      validIds.has(item.dependencyModId) &&
      item.dependencyModId !== mod.id
        ? item.dependencyModId
        : undefined,
    externalName:
      String(
        item.externalName ?? '',
      ).trim(),
    externalUrl:
      String(
        item.externalUrl ?? '',
      ).trim(),
    type:
      item.type === 'OPTIONAL'
        ? ('OPTIONAL' as const)
        : ('REQUIRED' as const),
    note: String(
      item.note ?? '',
    ).trim(),
  }));

  const dependencies =
    await replaceModDependencies(
      mod.id,
      normalized,
    );

  return NextResponse.json({
    ok: true,
    dependencies,
  });
}
