import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import {
  deleteNotification,
  markNotificationRead,
} from '@/lib/notifications';

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function PATCH(
  _request: Request,
  context: RouteContext,
) {
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

  const { id } = await context.params;

  const notification =
    await markNotificationRead(id, currentUser.id);

  if (!notification) {
    return NextResponse.json(
      {
        ok: false,
        message: 'Không tìm thấy truyền âm.',
      },
      { status: 404 },
    );
  }

  return NextResponse.json({
    ok: true,
    notification,
  });
}

export async function DELETE(
  _request: Request,
  context: RouteContext,
) {
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

  const { id } = await context.params;

  const deleted = await deleteNotification(
    id,
    currentUser.id,
  );

  if (!deleted) {
    return NextResponse.json(
      {
        ok: false,
        message: 'Không tìm thấy truyền âm.',
      },
      { status: 404 },
    );
  }

  return NextResponse.json({
    ok: true,
    message: 'Đã xóa truyền âm.',
  });
}
