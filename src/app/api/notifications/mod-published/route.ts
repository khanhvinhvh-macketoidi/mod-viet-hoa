import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getModById } from '@/lib/mods';
import { createModPublishedNotifications } from '@/lib/notifications';

export async function POST(request: Request) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return NextResponse.json(
      {
        ok: false,
        message: 'Đạo hữu cần đăng nhập.',
      },
      { status: 401 },
    );
  }

  if (
    currentUser.role !== 'MODDER' &&
    currentUser.role !== 'ADMIN'
  ) {
    return NextResponse.json(
      {
        ok: false,
        message: 'Đạo hữu không có quyền thực hiện thao tác này.',
      },
      { status: 403 },
    );
  }

  const body = (await request.json()) as {
    modId?: unknown;
  };

  const modId =
    typeof body.modId === 'string'
      ? body.modId.trim()
      : '';

  if (!modId) {
    return NextResponse.json(
      {
        ok: false,
        message: 'Thiếu modId.',
      },
      { status: 400 },
    );
  }

  const mod = await getModById(modId);

  if (!mod) {
    return NextResponse.json(
      {
        ok: false,
        message: 'Không tìm thấy bí tịch.',
      },
      { status: 404 },
    );
  }

  if (
    mod.authorId &&
    mod.authorId !== currentUser.id &&
    currentUser.role !== 'ADMIN'
  ) {
    return NextResponse.json(
      {
        ok: false,
        message: 'Đạo hữu không phải tác giả của mod này.',
      },
      { status: 403 },
    );
  }

  const created =
    await createModPublishedNotifications(
      mod.authorId || currentUser.id,
      mod,
    );

  return NextResponse.json({
    ok: true,
    created,
    message: `Đã tạo ${created} truyền âm cho đồng đạo.`,
  });
}
