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


import { createSafeRedirectUrl } from '@/lib/production/url';
const MAX_COMMENT_LENGTH = 1000;
const COMMENT_COOLDOWN_MS = 10_000;
const MENTION_PATTERN =
  /(^|\s)@([A-Za-zÀ-ỹ0-9_.-]{2,40})/g;

function extractMentionNames(
  content: string,
): string[] {
  return Array.from(content.matchAll(MENTION_PATTERN))
    .map((match) => match[2].toLocaleLowerCase('vi'))
    .filter(
      (value, index, array) =>
        array.indexOf(value) === index,
    );
}

export async function POST(request: Request) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.redirect(
      createSafeRedirectUrl('/login', request),
      303,
    );
  }

  try {
    const formData = await request.formData();

    const modId = String(
      formData.get('modId') ?? '',
    ).trim();

    const modSlug = String(
      formData.get('modSlug') ?? '',
    ).trim();

    const parentId =
      String(formData.get('parentId') ?? '').trim() ||
      undefined;

    const content = String(
      formData.get('content') ?? '',
    ).trim();

    if (!modId || !modSlug) {
      throw new Error('Thiếu thông tin mod');
    }

    const mod = await getModById(modId);

    if (!mod) {
      return new Response('Mod not found', {
        status: 404,
      });
    }

    const comments = await getComments();

    if (parentId) {
      const parent = await getCommentById(parentId);

      if (!parent || parent.modId !== modId) {
        return NextResponse.redirect(
          createSafeRedirectUrl(
            `/mods/${modSlug}?commentError=invalid-parent#comments`, request),
          303,
        );
      }

      if (
        parent.moderationStatus === 'DELETED' ||
        isCommentEffectivelyLocked(comments, parent)
      ) {
        return NextResponse.redirect(
          createSafeRedirectUrl(
            `/mods/${modSlug}?commentError=locked#comment-${parent.id}`, request),
          303,
        );
      }
    }

    if (!content) {
      return NextResponse.redirect(
        createSafeRedirectUrl(
          `/mods/${modSlug}?commentError=empty#comments`, request),
        303,
      );
    }

    if (content.length > MAX_COMMENT_LENGTH) {
      return NextResponse.redirect(
        createSafeRedirectUrl(
          `/mods/${modSlug}?commentError=too-long#comments`, request),
        303,
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
        Date.now() -
        new Date(latestUserComment.createdAt).getTime();

      if (elapsed < COMMENT_COOLDOWN_MS) {
        return NextResponse.redirect(
          createSafeRedirectUrl(
            `/mods/${modSlug}?commentError=too-fast#comments`, request),
          303,
        );
      }
    }

    const users = await getUsers();
    const mentionNames = new Set(
      extractMentionNames(content),
    );

    const mentionedUserIds = users
      .filter((item) => {
        const candidates = [
          item.name,
          item.profileSlug,
          item.profile?.displayName,
        ]
          .filter(Boolean)
          .map((value) =>
            String(value).toLocaleLowerCase('vi'),
          );

        return candidates.some((value) =>
          mentionNames.has(value),
        );
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
      moderationStatus: 'VISIBLE',
      isLocked: false,
      createdAt: now,
      updatedAt: now,
    };

    comments.push(newComment);
    await saveComments(comments);

    try {
      await createCommentNotifications({
        comment: newComment,
        mod,
      });
    } catch (notificationError) {
      console.error(
        'Luận bàn đã lưu nhưng không thể tạo notification:',
        notificationError,
      );
    }

    return NextResponse.redirect(
      createSafeRedirectUrl(
        `/mods/${modSlug}?commentSuccess=1#comment-${newComment.id}`, request),
      303,
    );
  } catch (error) {
    console.error('Lỗi đăng luận bàn:', error);

    return NextResponse.redirect(
      createSafeRedirectUrl('/mods?commentError=server', request),
      303,
    );
  }
}
