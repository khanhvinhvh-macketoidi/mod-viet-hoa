import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import {
  deleteCollection,
  getCollectionById,
  updateCollection,
} from '@/lib/collections';
import { getCollectionFollowerIds } from '@/lib/collection-follows';
import { createCollectionUpdatedNotifications } from '@/lib/notifications';

export async function PATCH(
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
    title?: string;
    description?: string;
    visibility?: 'PUBLIC' | 'PRIVATE';
  };

  const title = String(body.title ?? '').trim();

  if (!title) {
    return NextResponse.json(
      { ok: false },
      { status: 400 },
    );
  }

  const collection = await updateCollection(
    id,
    user.id,
    user.role === 'ADMIN',
    {
      title,
      description: String(
        body.description ?? '',
      ).trim(),
      visibility:
        body.visibility === 'PUBLIC'
          ? 'PUBLIC'
          : 'PRIVATE',
    },
  );

  if (!collection) {
    return NextResponse.json(
      { ok: false },
      { status: 404 },
    );
  }

  if (
    collection.visibility === 'PUBLIC' &&
    collection.moderationStatus !== 'HIDDEN'
  ) {
    const followerIds =
      await getCollectionFollowerIds(
        collection.id,
      );

    await createCollectionUpdatedNotifications(
      collection,
      followerIds,
    );
  }

  return NextResponse.json({
    ok: true,
    collection,
  });
}

export async function DELETE(
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
  const deleted = await deleteCollection(
    id,
    user.id,
    user.role === 'ADMIN',
  );

  return NextResponse.json(
    { ok: deleted },
    { status: deleted ? 200 : 404 },
  );
}

export async function GET(
  _request: Request,
  {
    params,
  }: {
    params: Promise<{ id: string }>;
  },
) {
  const user = await getCurrentUser();
  const { id } = await params;
  const collection =
    await getCollectionById(id);

  if (!collection) {
    return NextResponse.json(
      { ok: false },
      { status: 404 },
    );
  }

  const canRead =
    collection.visibility === 'PUBLIC' ||
    collection.ownerId === user?.id ||
    user?.role === 'ADMIN';

  if (!canRead) {
    return NextResponse.json(
      { ok: false },
      { status: 403 },
    );
  }

  return NextResponse.json({
    ok: true,
    collection,
  });
}
