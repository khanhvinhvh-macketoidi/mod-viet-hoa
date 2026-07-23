import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getModById } from '@/lib/mods';
import {
  getCollectionById,
  toggleCollectionItem,
} from '@/lib/collections';
import { getCollectionFollowerIds } from '@/lib/collection-follows';
import { createCollectionModAddedNotifications } from '@/lib/notifications';

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
      { ok: false },
      { status: 401 },
    );
  }

  const { id } = await params;
  const body = (await request.json()) as {
    modId?: string;
  };

  const modId = String(body.modId ?? '');

  const mod = await getModById(modId);

  if (!mod) {
    return NextResponse.json(
      { ok: false },
      { status: 404 },
    );
  }

  try {
    const result = await toggleCollectionItem(
      id,
      modId,
      user.id,
    );

    if (result.added) {
      const collection =
        await getCollectionById(id);

      if (
        collection &&
        collection.visibility === 'PUBLIC' &&
        collection.moderationStatus !== 'HIDDEN'
      ) {
        const followerIds =
          await getCollectionFollowerIds(id);

        await createCollectionModAddedNotifications(
          collection,
          mod,
          followerIds,
        );
      }
    }

    return NextResponse.json({
      ok: true,
      ...result,
    });
  } catch {
    return NextResponse.json(
      { ok: false },
      { status: 403 },
    );
  }
}
