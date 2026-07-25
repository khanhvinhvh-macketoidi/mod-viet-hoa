import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getModById } from '@/lib/mods';
import { toggleModFavorite } from '@/lib/favorites';
import { grantCultivation, revokeCultivation } from '@/lib/cultivation-service';

export async function POST(
  _request: Request,
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

  const result = await toggleModFavorite(
    id,
    user.id,
  );

  if (mod.authorId && mod.authorId !== user.id) {
    const key = `MOD_LIKE:${id}:${user.id}`;
    if (result.favorited) {
      await grantCultivation({
        userId: mod.authorId,
        type: 'MOD_LIKED',
        points: 20,
        targetId: id,
        uniqueKey: key,
        metadata: { likerUserId: user.id },
      });
    } else {
      await revokeCultivation({
        userId: mod.authorId,
        uniqueKey: key,
        type: 'MOD_UNLIKED',
        points: 20,
        targetId: id,
        metadata: { likerUserId: user.id },
      });
    }
  }

  return NextResponse.json({
    ok: true,
    ...result,
  });
}
