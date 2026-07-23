import { NextResponse } from 'next/server';

import { getCurrentUser } from '@/lib/auth';
import {
  getCommentById,
  getComments,
  getModById,
  saveComments,
} from '@/lib/store';


import { createSafeRedirectUrl } from '@/lib/production/url';
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
  const user = await getCurrentUser();

  if (!user) {
    return new Response('Unauthorized', {
      status: 401,
    });
  }

  const { id } = await params;
  const comment = await getCommentById(id);

  if (!comment) {
    return new Response('Comment not found', {
      status: 404,
    });
  }

  const canDelete =
    comment.userId === user.id ||
    user.role === 'ADMIN';

  if (!canDelete) {
    return new Response('Forbidden', {
      status: 403,
    });
  }

  const mod = await getModById(comment.modId);
  const comments = await getComments();
  const hasChildren = comments.some(
    (item) => item.parentId === id,
  );

  let nextComments;

  if (hasChildren) {
    nextComments = comments.map((item) =>
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
    );
  } else {
    nextComments = comments.filter(
      (item) => item.id !== id,
    );
  }

  await saveComments(nextComments);

  const destination = mod
    ? `/mods/${mod.slug}?commentDeleted=1#comments`
    : '/mods';

  return NextResponse.redirect(
    createSafeRedirectUrl(destination, request),
    303,
  );
}
