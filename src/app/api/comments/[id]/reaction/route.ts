import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getCommentById } from '@/lib/store';
import { toggleCommentLike } from '@/lib/comment-reactions';
import { rewardCommentLike } from '@/lib/cultivation-service';

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
      { ok: false, message: 'Đạo hữu cần đăng nhập.' },
      { status: 401 },
    );
  }

  const { id } = await params;
  const comment = await getCommentById(id);

  if (
    !comment ||
    comment.moderationStatus === 'DELETED'
  ) {
    return NextResponse.json(
      { ok: false, message: 'Luận bàn không tồn tại.' },
      { status: 404 },
    );
  }

  const result = await toggleCommentLike(id, user.id);

  try {
    await rewardCommentLike({
      ownerUserId: comment.userId,
      likerUserId: user.id,
      commentId: id,
      liked: result.liked,
    });
  } catch (error) {
    // Restore both sides. rewardCommentLike is idempotent, so the opposite
    // transition safely compensates even if the first mutation was partial.
    await rewardCommentLike({
      ownerUserId: comment.userId,
      likerUserId: user.id,
      commentId: id,
      liked: !result.liked,
    }).catch(() => undefined);
    await toggleCommentLike(id, user.id).catch(() => undefined);

    console.error('Không thể đồng bộ XP lượt thích luận bàn:', error);
    return NextResponse.json(
      { ok: false, message: 'Không thể cập nhật lượt thích.' },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    ...result,
  });
}
