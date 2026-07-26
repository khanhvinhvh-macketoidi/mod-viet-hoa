import { NextResponse } from 'next/server';

import { getCurrentUser } from '@/lib/auth';
import {
  getCommentById,
  getModById,
  getComments,
  getUsers,
  saveComments,
} from '@/lib/store';
import { isCommentEffectivelyLocked } from '@/lib/comment-tree';
import { createCommentNotifications } from '@/lib/notifications';
import type { CommentItem } from '@/lib/types';
import { isCommunityMediaAssetId } from '@/lib/community-media-server';
import {
  rewardCommentCreated,
  revokeCommentCreated,
} from '@/lib/cultivation-service';
import { createSafeRedirectUrl } from '@/lib/production/url';

const MAX_COMMENT_LENGTH = 1000;
const COMMENT_COOLDOWN_MS = 10_000;
const MENTION_PATTERN = /(^|\s)@([A-Za-zÀ-ỹ0-9_.-]{2,40})/g;

function extractMentionNames(content: string): string[] {
  return Array.from(content.matchAll(MENTION_PATTERN))
    .map((match) => match[2].toLocaleLowerCase('vi'))
    .filter(
      (value, index, array) => array.indexOf(value) === index,
    );
}

function wantsJson(request: Request): boolean {
  return (
    request.headers.get('x-requested-with') === 'XMLHttpRequest' ||
    (request.headers.get('accept') ?? '').includes('application/json')
  );
}

function withResponseHeaders(
  response: NextResponse,
  requestId: string,
): NextResponse {
  response.headers.set('Cache-Control', 'no-store');
  response.headers.set('X-Request-Id', requestId);
  return response;
}

function commentRedirect(
  request: Request,
  pathname: string,
  requestId: string,
): NextResponse {
  return withResponseHeaders(
    NextResponse.redirect(
      createSafeRedirectUrl(pathname, request),
      303,
    ),
    requestId,
  );
}

function commentError(
  request: Request,
  requestId: string,
  message: string,
  status: number,
  redirectPath: string,
): NextResponse {
  if (wantsJson(request)) {
    return withResponseHeaders(
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

  return commentRedirect(request, redirectPath, requestId);
}

function commentSuccess(
  request: Request,
  requestId: string,
  input: {
    comment: CommentItem;
    modSlug: string;
  },
): NextResponse {
  if (wantsJson(request)) {
    return withResponseHeaders(
      NextResponse.json({
        ok: true,
        commentId: input.comment.id,
        comment: input.comment,
        requestId,
      }),
      requestId,
    );
  }

  return commentRedirect(
    request,
    `/mods/${input.modSlug}?commentSuccess=1#comment-${input.comment.id}`,
    requestId,
  );
}

export async function POST(request: Request) {
  const requestId = crypto.randomUUID();

  try {
    const user = await getCurrentUser();

    if (!user) {
      if (wantsJson(request)) {
        return commentError(
          request,
          requestId,
          'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.',
          401,
          '/login',
        );
      }

      return commentRedirect(request, '/login', requestId);
    }

    const formData = await request.formData();

    const modId = String(formData.get('modId') ?? '').trim();
    const modSlug = String(formData.get('modSlug') ?? '').trim();
    const parentId =
      String(formData.get('parentId') ?? '').trim() || undefined;
    const content = String(formData.get('content') ?? '').trim();
    const rawMediaAssetId = String(formData.get('mediaAssetId') ?? '').trim();
    const mediaAssetId = rawMediaAssetId &&
      await isCommunityMediaAssetId(rawMediaAssetId)
      ? rawMediaAssetId
      : undefined;

    if (!modId || !modSlug) {
      return commentError(
        request,
        requestId,
        'Thiếu thông tin mod.',
        400,
        '/mods?commentError=server',
      );
    }

    const mod = await getModById(modId);

    if (rawMediaAssetId && !mediaAssetId) {
      return commentError(
        request,
        requestId,
        'Sticker hoặc GIF không hợp lệ.',
        400,
        `/mods/${modSlug}?commentError=invalid-media#comments`,
      );
    }

    if (!mod) {
      return commentError(
        request,
        requestId,
        'Không tìm thấy mod.',
        404,
        '/mods?commentError=server',
      );
    }

    const comments = await getComments();

    if (parentId) {
      const parent = await getCommentById(parentId);

      if (!parent || parent.modId !== modId) {
        return commentError(
          request,
          requestId,
          'Luận bàn cha không hợp lệ.',
          400,
          `/mods/${modSlug}?commentError=invalid-parent#comments`,
        );
      }

      if (
        parent.moderationStatus === 'DELETED' ||
        isCommentEffectivelyLocked(comments, parent)
      ) {
        return commentError(
          request,
          requestId,
          'Nhánh luận bàn này đã bị khóa.',
          409,
          `/mods/${modSlug}?commentError=locked#comment-${parent.id}`,
        );
      }
    }

    if (!content && !mediaAssetId) {
      return commentError(
        request,
        requestId,
        'Nội dung trả lời không được để trống.',
        400,
        `/mods/${modSlug}?commentError=empty#comments`,
      );
    }

    if (content.length > MAX_COMMENT_LENGTH) {
      return commentError(
        request,
        requestId,
        `Nội dung không được vượt quá ${MAX_COMMENT_LENGTH} ký tự.`,
        400,
        `/mods/${modSlug}?commentError=too-long#comments`,
      );
    }

    const latestUserComment = comments
      .filter((comment) => comment.userId === user.id)
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() -
          new Date(a.createdAt).getTime(),
      )[0];

    if (latestUserComment) {
      const elapsed =
        Date.now() - new Date(latestUserComment.createdAt).getTime();

      if (elapsed < COMMENT_COOLDOWN_MS) {
        const retryAfterSeconds = Math.max(
          1,
          Math.ceil((COMMENT_COOLDOWN_MS - elapsed) / 1000),
        );
        const response = commentError(
          request,
          requestId,
          'Đạo hữu thao tác quá nhanh. Vui lòng chờ một chút rồi thử lại.',
          429,
          `/mods/${modSlug}?commentError=too-fast#comments`,
        );
        response.headers.set(
          'Retry-After',
          String(retryAfterSeconds),
        );
        return response;
      }
    }

    const users = await getUsers();
    const mentionNames = new Set(extractMentionNames(content));

    const mentionedUserIds = users
      .filter((item) => {
        const candidates = [
          item.name,
          item.profileSlug,
          item.profile?.displayName,
        ]
          .filter(Boolean)
          .map((value) => String(value).toLocaleLowerCase('vi'));

        return candidates.some((value) => mentionNames.has(value));
      })
      .map((item) => item.id)
      .filter((id) => id !== user.id);

    const now = new Date().toISOString();

    const newComment: CommentItem = {
      id: crypto.randomUUID(),
      modId,
      userId: user.id,
      userName:
        user.profile?.displayName?.trim() ||
        user.name?.trim() ||
        user.email ||
        'Thành viên',
      parentId,
      mentionedUserIds,
      content,
      mediaAssetId,
      moderationStatus: 'VISIBLE',
      isLocked: false,
      createdAt: now,
      updatedAt: now,
    };

    const previousComments = [...comments];
    comments.push(newComment);
    await saveComments(comments);

    try {
      await rewardCommentCreated({
        userId: user.id,
        commentId: newComment.id,
        isReply: Boolean(parentId),
      });
    } catch (cultivationError) {
      await saveComments(previousComments);

      await revokeCommentCreated({
        userId: user.id,
        commentId: newComment.id,
        isReply: Boolean(parentId),
      }).catch(() => undefined);

      throw cultivationError;
    }

    try {
      await createCommentNotifications({
        comment: newComment,
        mod,
      });
    } catch (notificationError) {
      console.error(
        `[${requestId}] Luận bàn đã lưu nhưng không thể tạo notification:`,
        notificationError,
      );
    }

    return commentSuccess(request, requestId, {
      comment: newComment,
      modSlug,
    });
  } catch (error) {
    console.error(`[${requestId}] Lỗi đăng luận bàn:`, error);

    return commentError(
      request,
      requestId,
      'Không thể gửi luận bàn. Vui lòng thử lại.',
      500,
      '/mods?commentError=server',
    );
  }
}
