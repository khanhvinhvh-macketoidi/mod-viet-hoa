import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getCommentById } from '@/lib/store';
import { toggleCommentLike } from '@/lib/comment-reactions';

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

  const result = await toggleCommentLike(
    id,
    user.id,
  );

  return NextResponse.json({
    ok: true,
    ...result,
  });
}
