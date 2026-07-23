import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getUsers, saveUsers } from '@/lib/users';

function normalizePosition(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return null;
  }

  return Math.max(0, Math.min(100, Math.round(value * 10) / 10));
}

export async function PATCH(request: Request) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return NextResponse.json(
      { ok: false, message: 'Đạo hữu cần đăng nhập.' },
      { status: 401 },
    );
  }

  try {
    const body = (await request.json()) as {
      x?: unknown;
      y?: unknown;
    };

    const x = normalizePosition(body.x);
    const y = normalizePosition(body.y);

    if (x === null || y === null) {
      return NextResponse.json(
        {
          ok: false,
          message: 'Vị trí ảnh bìa không hợp lệ.',
        },
        { status: 400 },
      );
    }

    const users = await getUsers();
    const userIndex = users.findIndex(
      (user) => user.id === currentUser.id,
    );

    if (userIndex < 0) {
      return NextResponse.json(
        { ok: false, message: 'Không tìm thấy tài khoản.' },
        { status: 404 },
      );
    }

    if (!users[userIndex].profile?.coverImage) {
      return NextResponse.json(
        {
          ok: false,
          message: 'Đạo hữu chưa có ảnh bìa để điều chỉnh.',
        },
        { status: 400 },
      );
    }

    users[userIndex] = {
      ...users[userIndex],
      profile: {
        ...users[userIndex].profile,
        displayName: users[userIndex].profile?.displayName ||
          users[userIndex].name,
        coverPosition: { x, y },
      },
      updatedAt: new Date().toISOString(),
    };

    await saveUsers(users);

    return NextResponse.json({
      ok: true,
      message: 'Đã lưu vị trí ảnh bìa.',
      coverPosition: { x, y },
    });
  } catch (error) {
    console.error('Không thể lưu vị trí cover:', error);

    return NextResponse.json(
      {
        ok: false,
        message:
          error instanceof Error
            ? error.message
            : 'Không thể lưu vị trí ảnh bìa.',
      },
      { status: 500 },
    );
  }
}
