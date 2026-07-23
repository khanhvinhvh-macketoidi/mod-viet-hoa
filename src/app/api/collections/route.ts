import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import {
  createCollection,
  deleteCollection,
  getCollectionsByOwnerId,
  toggleCollectionItem,
} from '@/lib/collections';
import { getModById } from '@/lib/mods';

export async function GET() {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json(
      { ok: false },
      { status: 401 },
    );
  }

  return NextResponse.json({
    ok: true,
    collections:
      await getCollectionsByOwnerId(user.id),
  });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json(
      { ok: false },
      { status: 401 },
    );
  }

  const body = (await request.json()) as {
    title?: string;
    description?: string;
    visibility?: 'PUBLIC' | 'PRIVATE';
    modId?: string;
  };

  const title = String(body.title ?? '').trim();

  if (!title) {
    return NextResponse.json(
      {
        ok: false,
        message: 'Tên Tàng Kinh Các không được để trống.',
      },
      { status: 400 },
    );
  }

  const modId = String(body.modId ?? '').trim();

  if (modId) {
    const mod = await getModById(modId);

    if (!mod) {
      return NextResponse.json(
        {
          ok: false,
          message: 'Không tìm thấy bí tịch cần thêm vào Tàng Kinh Các.',
        },
        { status: 404 },
      );
    }
  }

  const collection = await createCollection({
    ownerId: user.id,
    title,
    description: String(
      body.description ?? '',
    ).trim(),
    visibility:
      body.visibility === 'PUBLIC'
        ? 'PUBLIC'
        : 'PRIVATE',
  });

  try {
    if (modId) {
      await toggleCollectionItem(
        collection.id,
        modId,
        user.id,
      );
    }
  } catch {
    // Giữ thao tác nguyên tử: nếu không thêm được mod thì xóa collection vừa tạo.
    await deleteCollection(
      collection.id,
      user.id,
      false,
    );

    return NextResponse.json(
      {
        ok: false,
        message: 'Không thể thêm mod vào Tàng Kinh Các mới.',
      },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    collection,
    addedModId: modId || null,
  });
}
