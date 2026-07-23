import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import {
  getNotificationsByUserId,
  getUnreadNotificationCount,
  markAllNotificationsRead,
} from '@/lib/notifications';

export async function GET(request: Request) {
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

  const url = new URL(request.url);
  const limitValue = Number(
    url.searchParams.get('limit') ?? '20',
  );

  const limit = Number.isFinite(limitValue)
    ? Math.max(1, Math.min(100, Math.floor(limitValue)))
    : 20;

  const notifications =
    await getNotificationsByUserId(currentUser.id);

  const unreadCount =
    await getUnreadNotificationCount(currentUser.id);

  return NextResponse.json({
    ok: true,
    notifications: notifications.slice(0, limit),
    unreadCount,
    total: notifications.length,
  });
}

export async function PATCH() {
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

  const updated = await markAllNotificationsRead(
    currentUser.id,
  );

  return NextResponse.json({
    ok: true,
    updated,
    unreadCount: 0,
    message:
      updated > 0
        ? 'Đã đánh dấu tất cả truyền âm là đã đọc.'
        : 'Không có truyền âm chưa đọc.',
  });
}
