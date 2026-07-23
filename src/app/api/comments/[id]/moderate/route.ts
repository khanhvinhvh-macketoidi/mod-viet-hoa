import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import {
  getCommentById,
  getComments,
  getModById,
  saveComments,
} from '@/lib/store';


import { createSafeRedirectUrl } from '@/lib/production/url';
type ModerationAction =
  | 'hide'
  | 'show'
  | 'lock'
  | 'unlock';

export async function POST(
  request: Request,
  {
    params,
  }: {
    params: Promise<{ id: string }>;
  },
) {
  const user = await getCurrentUser();

  if (!user || user.role !== 'ADMIN') {
    return new Response('Forbidden', {
      status: 403,
    });
  }

  const { id } = await params;
  const comment = await getCommentById(id);

  if (!comment) {
    return new Response('Comment not found', {
      status: 404,
    });
  }

  const formData = await request.formData();
  const action = String(
    formData.get('action') ?? '',
  ) as ModerationAction;

  if (
    !['hide', 'show', 'lock', 'unlock'].includes(
      action,
    )
  ) {
    return new Response('Invalid moderation action', {
      status: 400,
    });
  }

  const comments = await getComments();
  const now = new Date().toISOString();

  const next = comments.map((item) => {
    if (item.id !== id) return item;

    switch (action) {
      case 'hide':
        return {
          ...item,
          moderationStatus: 'HIDDEN' as const,
          moderatedByUserId: user.id,
          moderatedAt: now,
          updatedAt: now,
        };

      case 'show':
        return {
          ...item,
          moderationStatus: 'VISIBLE' as const,
          moderatedByUserId: user.id,
          moderatedAt: now,
          updatedAt: now,
        };

      case 'lock':
        return {
          ...item,
          isLocked: true,
          moderatedByUserId: user.id,
          moderatedAt: now,
          updatedAt: now,
        };

      case 'unlock':
        return {
          ...item,
          isLocked: false,
          moderatedByUserId: user.id,
          moderatedAt: now,
          updatedAt: now,
        };
    }
  });

  await saveComments(next);

  const mod = await getModById(comment.modId);
  const destination = mod
    ? `/mods/${mod.slug}#comment-${comment.id}`
    : '/mods';

  return NextResponse.redirect(
    createSafeRedirectUrl(destination, request),
    303,
  );
}
