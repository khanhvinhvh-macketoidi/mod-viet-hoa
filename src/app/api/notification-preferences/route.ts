import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import {
  getNotificationPreferences,
  saveNotificationPreferences,
  type NotificationPreferences,
} from '@/lib/notification-preferences';

const KEYS: (keyof NotificationPreferences)[] = [
  'follow',
  'modPublished',
  'comment',
  'reply',
  'review',
];

export async function GET() {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json(
      { ok: false, message: 'Đạo hữu cần đăng nhập.' },
      { status: 401 },
    );
  }

  const preferences =
    await getNotificationPreferences(user.id);

  return NextResponse.json({
    ok: true,
    preferences,
  });
}

export async function PATCH(request: Request) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json(
      { ok: false, message: 'Đạo hữu cần đăng nhập.' },
      { status: 401 },
    );
  }

  try {
    const body = (await request.json()) as Record<
      string,
      unknown
    >;

    const patch: Partial<NotificationPreferences> = {};

    for (const key of KEYS) {
      if (typeof body[key] === 'boolean') {
        patch[key] = body[key] as boolean;
      }
    }

    const preferences =
      await saveNotificationPreferences(
        user.id,
        patch,
      );

    return NextResponse.json({
      ok: true,
      preferences,
    });
  } catch {
    return NextResponse.json(
      {
        ok: false,
        message: 'Dữ liệu cài đặt không hợp lệ.',
      },
      { status: 400 },
    );
  }
}
