import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import {
  followUser,
  getFollowerCount,
  isFollowing,
  unfollowUser,
} from '@/lib/follows';
import {
  createFollowNotification,
  removeFollowNotification,
} from '@/lib/notifications';
import { getUserById } from '@/lib/users';

function readTargetUserId(
  request: Request,
): string {
  const url = new URL(request.url);

  return (
    url.searchParams.get('userId')?.trim() ??
    ''
  );
}

export async function GET(request: Request) {
  const currentUser = await getCurrentUser();
  const targetUserId = readTargetUserId(request);

  if (!targetUserId) {
    return NextResponse.json(
      {
        ok: false,
        message: 'Thiếu userId.',
      },
      { status: 400 },
    );
  }

  const targetUser = await getUserById(targetUserId);

  if (!targetUser || targetUser.isActive === false) {
    return NextResponse.json(
      {
        ok: false,
        message: 'Không tìm thấy người dùng.',
      },
      { status: 404 },
    );
  }

  const [following, followerCount] =
    await Promise.all([
      currentUser
        ? isFollowing(
            currentUser.id,
            targetUserId,
          )
        : Promise.resolve(false),
      getFollowerCount(targetUserId),
    ]);

  return NextResponse.json({
    ok: true,
    authenticated: Boolean(currentUser),
    isOwnProfile:
      currentUser?.id === targetUserId,
    following,
    followerCount,
  });
}

export async function POST(request: Request) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return NextResponse.json(
      {
        ok: false,
        message: 'Đạo hữu cần đăng nhập để theo dõi tác giả.',
      },
      { status: 401 },
    );
  }

  try {
    const body = (await request.json()) as {
      userId?: unknown;
    };

    const targetUserId =
      typeof body.userId === 'string'
        ? body.userId.trim()
        : '';

    if (!targetUserId) {
      return NextResponse.json(
        {
          ok: false,
          message: 'Thiếu userId.',
        },
        { status: 400 },
      );
    }

    if (currentUser.id === targetUserId) {
      return NextResponse.json(
        {
          ok: false,
          message: 'Đạo hữu không thể tự theo dõi chính mình.',
        },
        { status: 400 },
      );
    }

    const targetUser = await getUserById(
      targetUserId,
    );

    if (!targetUser || targetUser.isActive === false) {
      return NextResponse.json(
        {
          ok: false,
          message: 'Không tìm thấy người dùng.',
        },
        { status: 404 },
      );
    }

    const alreadyFollowing = await isFollowing(
      currentUser.id,
      targetUserId,
    );

    await followUser(
      currentUser.id,
      targetUserId,
    );

    if (!alreadyFollowing) {
      await createFollowNotification(
        currentUser.id,
        targetUserId,
      );
    }

    const followerCount =
      await getFollowerCount(targetUserId);

    return NextResponse.json({
      ok: true,
      following: true,
      followerCount,
      message: 'Đã kết giao với tác giả.',
    });
  } catch (error) {
    console.error('Không thể theo dõi:', error);

    return NextResponse.json(
      {
        ok: false,
        message:
          error instanceof Error
            ? error.message
            : 'Không thể kết giao với tác giả.',
      },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request) {
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

  try {
    const body = (await request.json()) as {
      userId?: unknown;
    };

    const targetUserId =
      typeof body.userId === 'string'
        ? body.userId.trim()
        : '';

    if (!targetUserId) {
      return NextResponse.json(
        {
          ok: false,
          message: 'Thiếu userId.',
        },
        { status: 400 },
      );
    }

    await unfollowUser(
      currentUser.id,
      targetUserId,
    );

    await removeFollowNotification(
      currentUser.id,
      targetUserId,
    );

    const followerCount =
      await getFollowerCount(targetUserId);

    return NextResponse.json({
      ok: true,
      following: false,
      followerCount,
      message: 'Đã hủy kết giao với tác giả.',
    });
  } catch (error) {
    console.error('Không thể bỏ theo dõi:', error);

    return NextResponse.json(
      {
        ok: false,
        message:
          error instanceof Error
            ? error.message
            : 'Không thể hủy kết giao với tác giả.',
      },
      { status: 500 },
    );
  }
}
