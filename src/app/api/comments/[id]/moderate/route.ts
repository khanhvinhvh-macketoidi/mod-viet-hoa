import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import {
  getCommentById,
  getComments,
  getModById,
  saveComments,
} from '@/lib/store';
import type { CommentItem } from '@/lib/types';
import { createSafeRedirectUrl } from '@/lib/production/url';
import {
  rewardCommentHelpful,
  revokeCommentHelpful,
} from '@/lib/cultivation-service';
import {
  rewardCommentHelpfulReputation,
  revokeCommentHelpfulReputation,
} from '@/lib/reputation-service';

type ModerationAction =
  | 'hide'
  | 'show'
  | 'lock'
  | 'unlock'
  | 'helpful';

function wantsJson(request: Request): boolean {
  return (
    request.headers.get('x-requested-with') === 'XMLHttpRequest' ||
    (request.headers.get('accept') ?? '').includes('application/json')
  );
}

function withHeaders(
  response: NextResponse,
  requestId: string,
): NextResponse {
  response.headers.set('Cache-Control', 'no-store');
  response.headers.set('X-Request-Id', requestId);
  return response;
}

function moderationError(
  request: Request,
  requestId: string,
  message: string,
  status: number,
  redirectPath: string,
): NextResponse {
  if (wantsJson(request)) {
    return withHeaders(
      NextResponse.json(
        {
          ok: false,
          message,
          requestId,
        },
        { status },
      ),
      requestId,
    );
  }

  return withHeaders(
    NextResponse.redirect(
      createSafeRedirectUrl(redirectPath, request),
      303,
    ),
    requestId,
  );
}

function moderationSuccess(
  request: Request,
  requestId: string,
  comment: CommentItem,
  destination: string,
): NextResponse {
  if (wantsJson(request)) {
    return withHeaders(
      NextResponse.json({
        ok: true,
        comment,
        requestId,
      }),
      requestId,
    );
  }

  return withHeaders(
    NextResponse.redirect(
      createSafeRedirectUrl(destination, request),
      303,
    ),
    requestId,
  );
}

export async function POST(
  request: Request,
  {
    params,
  }: {
    params: Promise<{ id: string }>;
  },
) {
  const requestId = crypto.randomUUID();

  try {
    const user = await getCurrentUser();

    if (!user || user.role !== 'ADMIN') {
      return moderationError(
        request,
        requestId,
        'Bạn không có quyền quản trị luận bàn.',
        403,
        '/mods?commentError=server',
      );
    }

    const { id } = await params;
    const comment = await getCommentById(id);

    if (!comment) {
      return moderationError(
        request,
        requestId,
        'Không tìm thấy luận bàn.',
        404,
        '/mods?commentError=server',
      );
    }

    const formData = await request.formData();
    const action = String(
      formData.get('action') ?? '',
    ) as ModerationAction;
    const mod = await getModById(comment.modId);
    const destination = mod
      ? `/mods/${mod.slug}#comment-${comment.id}`
      : '/mods';

    if (action === 'helpful') {
      if (!mod) {
        return moderationError(
          request,
          requestId,
          'Không tìm thấy mod.',
          404,
          '/mods?commentError=server',
        );
      }

      const cultivationReward = await rewardCommentHelpful({
        userId: comment.userId,
        commentId: comment.id,
        markedByUserId: user.id,
      });

      try {
        await rewardCommentHelpfulReputation({
          userId: comment.userId,
          commentId: comment.id,
          markedByUserId: user.id,
        });
      } catch (error) {
        if (cultivationReward.granted) {
          await revokeCommentHelpful({
            userId: comment.userId,
            commentId: comment.id,
          }).catch(() => undefined);
        }

        await revokeCommentHelpfulReputation({
          userId: comment.userId,
          commentId: comment.id,
        }).catch(() => undefined);

        throw error;
      }

      return moderationSuccess(
        request,
        requestId,
        comment,
        destination,
      );
    }

    if (
      !['hide', 'show', 'lock', 'unlock'].includes(
        action,
      )
    ) {
      return moderationError(
        request,
        requestId,
        'Thao tác quản trị không hợp lệ.',
        400,
        destination,
      );
    }

    const comments = await getComments();
    const now = new Date().toISOString();
    let updatedComment: CommentItem | undefined;

    const next = comments.map((item) => {
      if (item.id !== id) return item;

      switch (action) {
        case 'hide':
          updatedComment = {
            ...item,
            moderationStatus: 'HIDDEN',
            moderatedByUserId: user.id,
            moderatedAt: now,
            updatedAt: now,
          };
          return updatedComment;

        case 'show':
          updatedComment = {
            ...item,
            moderationStatus: 'VISIBLE',
            moderatedByUserId: user.id,
            moderatedAt: now,
            updatedAt: now,
          };
          return updatedComment;

        case 'lock':
          updatedComment = {
            ...item,
            isLocked: true,
            moderatedByUserId: user.id,
            moderatedAt: now,
            updatedAt: now,
          };
          return updatedComment;

        case 'unlock':
          updatedComment = {
            ...item,
            isLocked: false,
            moderatedByUserId: user.id,
            moderatedAt: now,
            updatedAt: now,
          };
          return updatedComment;
      }
    });

    if (!updatedComment) {
      return moderationError(
        request,
        requestId,
        'Không tìm thấy luận bàn cần cập nhật.',
        404,
        destination,
      );
    }

    await saveComments(next);

    return moderationSuccess(
      request,
      requestId,
      updatedComment,
      destination,
    );
  } catch (error) {
    console.error(
      `[${requestId}] Không thể quản trị luận bàn:`,
      error,
    );

    return moderationError(
      request,
      requestId,
      'Không thể cập nhật luận bàn.',
      500,
      '/mods?commentError=server',
    );
  }
}
