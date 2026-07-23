import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import {
  getCollectionById,
  getCollectionItems,
  saveCollectionItems,
} from '@/lib/collections';
import { getMods } from '@/lib/mods';
import { getCollectionFollowerIds } from '@/lib/collection-follows';
import { createCollectionModAddedNotifications } from '@/lib/notifications';

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
      {
        ok: false,
        message: 'Đạo hữu chưa đăng nhập.',
      },
      { status: 401 },
    );
  }

  const { id } = await params;
  const collection =
    await getCollectionById(id);

  if (!collection) {
    return NextResponse.json(
      {
        ok: false,
        message: 'Không tìm thấy Tàng Kinh Các.',
      },
      { status: 404 },
    );
  }

  if (
    collection.ownerId !== user.id &&
    user.role !== 'ADMIN'
  ) {
    return NextResponse.json(
      {
        ok: false,
        message:
          'Đạo hữu không có quyền quản lý Tàng Kinh Các này.',
      },
      { status: 403 },
    );
  }

  const body = (await request.json()) as {
    modIds?: unknown;
  };

  const requestedIds = Array.isArray(
    body.modIds,
  )
    ? body.modIds.map(String)
    : [];

  const mods = await getMods();
  const validModMap = new Map(
    mods.map((mod) => [mod.id, mod]),
  );

  const selectedIds = [
    ...new Set(
      requestedIds.filter((modId) =>
        validModMap.has(modId),
      ),
    ),
  ];

  const items = await getCollectionItems();
  const currentItems = items.filter(
    (item) => item.collectionId === id,
  );
  const currentIds = new Set(
    currentItems.map((item) => item.modId),
  );
  const selectedIdSet = new Set(selectedIds);

  const addedIds = selectedIds.filter(
    (modId) => !currentIds.has(modId),
  );
  const removedIds = [...currentIds].filter(
    (modId) => !selectedIdSet.has(modId),
  );

  const now = new Date().toISOString();

  const nextItems = [
    ...items.filter(
      (item) => item.collectionId !== id,
    ),
    ...selectedIds.map((modId) => ({
      collectionId: id,
      modId,
      addedByUserId: user.id,
      createdAt:
        currentItems.find(
          (item) => item.modId === modId,
        )?.createdAt ?? now,
    })),
  ];

  await saveCollectionItems(nextItems);

  if (
    addedIds.length > 0 &&
    collection.visibility === 'PUBLIC' &&
    collection.moderationStatus !== 'HIDDEN'
  ) {
    const followerIds =
      await getCollectionFollowerIds(id);

    for (const modId of addedIds) {
      const mod = validModMap.get(modId);

      if (mod) {
        await createCollectionModAddedNotifications(
          collection,
          mod,
          followerIds,
        );
      }
    }
  }

  return NextResponse.json({
    ok: true,
    addedCount: addedIds.length,
    removedCount: removedIds.length,
    totalCount: selectedIds.length,
  });
}
