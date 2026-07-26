import { NextResponse } from 'next/server';

import { getCurrentUser } from '@/lib/auth';
import {
  getCommentById,
  getComments,
  getModById,
  saveComments,
} from '@/lib/store';
import type { CommentItem } from '@/lib/types';
import {
  getCommentReactions,
  saveCommentReactions,
} from '@/lib/comment-reactions';
import { createSafeRedirectUrl } from '@/lib/production/url';
import { getCultivationLogs } from '@/lib/cultivation-repository';
import {
  grantCultivation,
  revokeCommentCreated,
  revokeCommentHelpful,
  revokeCultivation,
  CULTIVATION_POINTS,
} from '@/lib/cultivation-service';
import {
  rewardCommentHelpfulReputation,
  revokeCommentHelpfulReputation,
} from '@/lib/reputation-service';
import { getReputationLogs } from '@/lib/reputation-repository';

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

function deleteError(
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

function deleteSuccess(
  request: Request,
  requestId: string,
  input: {
    commentId: string;
    removed: boolean;
    comment?: CommentItem;
    destination: string;
  },
): NextResponse {
  if (wantsJson(request)) {
    return withHeaders(
      NextResponse.json({
        ok: true,
        commentId: input.commentId,
        removed: input.removed,
        comment: input.comment,
        requestId,
      }),
      requestId,
    );
  }

  return withHeaders(
    NextResponse.redirect(
      createSafeRedirectUrl(input.destination, request),
      303,
    ),
    requestId,
  );
}

async function runCompensations(
  compensations: Array<() => Promise<unknown>>,
): Promise<void> {
  const pending = compensations.splice(0).reverse();
  await Promise.allSettled(pending.map((compensate) => compensate()));
}

export async function POST(
  request: Request,
  {
    params,
  }: {
    params: Promise<{
      id: string;
    }>;
  },
) {
  const requestId = crypto.randomUUID();
  const user = await getCurrentUser();

  if (!user) {
    return deleteError(
      request,
      requestId,
      'Phiên đăng nhập đã hết hạn.',
      401,
      '/login',
    );
  }

  const { id } = await params;
  const comment = await getCommentById(id);

  if (!comment) {
    return deleteError(
      request,
      requestId,
      'Không tìm thấy luận bàn.',
      404,
      '/mods?commentError=server',
    );
  }

  const canDelete =
    comment.userId === user.id ||
    user.role === 'ADMIN';

  if (!canDelete) {
    return deleteError(
      request,
      requestId,
      'Bạn không có quyền xóa luận bàn này.',
      403,
      '/mods?commentError=server',
    );
  }

  const mod = await getModById(comment.modId);
  const destination = mod
    ? `/mods/${mod.slug}?commentDeleted=1#comments`
    : '/mods';

  // Repeated requests must remain idempotent.
  if (comment.moderationStatus === 'DELETED') {
    return deleteSuccess(
      request,
      requestId,
      {
        commentId: comment.id,
        removed: false,
        comment,
        destination,
      },
    );
  }

  const [comments, reactions, cultivationLogs, reputationLogs] =
    await Promise.all([
      getComments(),
      getCommentReactions(),
      getCultivationLogs(),
      getReputationLogs(),
    ]);

  const hasChildren = comments.some(
    (item) => item.parentId === id,
  );

  const nextComments = hasChildren
    ? comments.map((item) =>
        item.id === id
          ? {
              ...item,
              content: '',
              moderationStatus: 'DELETED' as const,
              isLocked: true,
              moderatedByUserId: user.id,
              moderatedAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            }
          : item,
      )
    : comments.filter((item) => item.id !== id);

  const nextReactions = reactions.filter(
    (reaction) => reaction.commentId !== id,
  );

  const compensations: Array<() => Promise<unknown>> = [];

  try {
    const creationReversal = await revokeCommentCreated({
      userId: comment.userId,
      commentId: comment.id,
      isReply: Boolean(comment.parentId),
    });

    if (creationReversal.reversed) {
      compensations.push(() =>
        grantCultivation({
          userId: comment.userId,
          type: comment.parentId ? 'REPLY_CREATED' : 'COMMENT_CREATED',
          points: comment.parentId
            ? CULTIVATION_POINTS.REPLY_CREATED
            : CULTIVATION_POINTS.COMMENT_CREATED,
          targetId: comment.id,
          uniqueKey: `COMMENT_CREATED:${comment.id}`,
        }),
      );
    }

    const activeLikeLogs = cultivationLogs.filter(
      (log) =>
        log.userId === comment.userId &&
        log.targetId === comment.id &&
        log.type === 'COMMENT_LIKED' &&
        !log.reversedAt &&
        Boolean(log.uniqueKey),
    );

    for (const likeLog of activeLikeLogs) {
      const points = Math.max(0, Number(likeLog.points || 0));
      if (!likeLog.uniqueKey || points <= 0) continue;

      const likeReversal = await revokeCultivation({
        userId: comment.userId,
        uniqueKey: likeLog.uniqueKey,
        type: 'COMMENT_UNLIKED',
        points,
        targetId: comment.id,
        metadata: likeLog.metadata,
      });

      if (likeReversal.reversed) {
        compensations.push(() =>
          grantCultivation({
            userId: comment.userId,
            type: 'COMMENT_LIKED',
            points,
            targetId: comment.id,
            uniqueKey: likeLog.uniqueKey,
            metadata: likeLog.metadata,
          }),
        );
      }
    }

    const helpfulReversal = await revokeCommentHelpful({
      userId: comment.userId,
      commentId: comment.id,
    });

    if (helpfulReversal.reversed) {
      compensations.push(() =>
        grantCultivation({
          userId: comment.userId,
          type: 'COMMENT_HELPFUL',
          points: CULTIVATION_POINTS.COMMENT_HELPFUL,
          targetId: comment.id,
          uniqueKey: `COMMENT_HELPFUL:${comment.id}`,
          metadata: { restoredAfterDeleteFailure: true },
        }),
      );
    }

    const activeHelpfulReputationLog = reputationLogs.find(
      (log) =>
        log.userId === comment.userId &&
        log.targetId === comment.id &&
        log.type === 'COMMENT_HELPFUL' &&
        !log.reversedAt,
    );

    const originalMarkerUserId =
      typeof activeHelpfulReputationLog?.metadata?.markedByUserId ===
      'string'
        ? activeHelpfulReputationLog.metadata.markedByUserId
        : user.id;

    const reputationReversal =
      await revokeCommentHelpfulReputation({
        userId: comment.userId,
        commentId: comment.id,
      });

    if (reputationReversal.reversed) {
      compensations.push(() =>
        rewardCommentHelpfulReputation({
          userId: comment.userId,
          commentId: comment.id,
          markedByUserId: originalMarkerUserId,
        }),
      );
    }

    try {
      await saveComments(nextComments);
      await saveCommentReactions(nextReactions);
    } catch (dataError) {
      await Promise.allSettled([
        saveComments(comments),
        saveCommentReactions(reactions),
      ]);
      await runCompensations(compensations);
      throw dataError;
    }
  } catch (error) {
    await runCompensations(compensations);
    console.error('Không thể hoàn XP khi xóa luận bàn:', error);

    return deleteError(
      request,
      requestId,
      'Không thể xóa luận bàn.',
      500,
      mod
        ? `/mods/${mod.slug}?commentError=server#comments`
        : '/mods?commentError=server',
    );
  }

  const updatedComment = hasChildren
    ? nextComments.find((item) => item.id === id)
    : undefined;

  return deleteSuccess(
    request,
    requestId,
    {
      commentId: id,
      removed: !hasChildren,
      comment: updatedComment,
      destination,
    },
  );
}
