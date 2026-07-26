import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getModById } from '@/lib/mods';
import { toggleModFavorite } from '@/lib/favorites';
import {
  rewardModLike,
  revokeModLike,
} from '@/lib/cultivation-service';

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

  const result = await toggleModFavorite(id, user.id);

  if (mod.authorId && mod.authorId !== user.id) {
    try {
      if (result.favorited) {
        await rewardModLike({
          ownerUserId: mod.authorId,
          likerUserId: user.id,
          modId: id,
        });
      } else {
        await revokeModLike({
          ownerUserId: mod.authorId,
          likerUserId: user.id,
          modId: id,
        });
      }
    } catch (error) {
      // Restore the cultivation state first, then restore the favorite record.
      if (result.favorited) {
        await revokeModLike({
          ownerUserId: mod.authorId,
          likerUserId: user.id,
          modId: id,
        }).catch(() => undefined);
      } else {
        await rewardModLike({
          ownerUserId: mod.authorId,
          likerUserId: user.id,
          modId: id,
        }).catch(() => undefined);
      }

      await toggleModFavorite(id, user.id).catch(() => undefined);
      console.error('Không thể đồng bộ XP yêu thích mod:', error);

      return NextResponse.json(
        { ok: false, message: 'Không thể cập nhật yêu thích.' },
        { status: 500 },
      );
    }
  }

  return NextResponse.json({
    ok: true,
    ...result,
  });
}
