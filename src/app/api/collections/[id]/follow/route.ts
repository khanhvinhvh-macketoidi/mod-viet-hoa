import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getCollectionById } from '@/lib/collections';
import { toggleCollectionFollow } from '@/lib/collection-follows';

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
  const collection =
    await getCollectionById(id);

  if (
    !collection ||
    collection.visibility !== 'PUBLIC' ||
    collection.moderationStatus === 'HIDDEN'
  ) {
    return NextResponse.json(
      { ok: false },
      { status: 404 },
    );
  }

  if (collection.ownerId === user.id) {
    return NextResponse.json(
      {
        ok: false,
        message:
          'Đạo hữu không thể theo dõi Tàng Kinh Các của chính mình.',
      },
      { status: 400 },
    );
  }

  const result =
    await toggleCollectionFollow(
      collection.id,
      user.id,
    );

  return NextResponse.json({
    ok: true,
    ...result,
  });
}
