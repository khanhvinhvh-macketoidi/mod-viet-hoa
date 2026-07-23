import { NextResponse } from 'next/server';

import { getCurrentUser } from '@/lib/auth';
import {
  getModById,
  getReviewById,
  getReviews,
  saveReviews,
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
  const review = await getReviewById(id);

  if (!review) {
    return new Response(
      'Review not found',
      {
        status: 404,
      },
    );
  }

  const canDelete =
    review.userId === user.id ||
    user.role === 'ADMIN';

  if (!canDelete) {
    return new Response('Forbidden', {
      status: 403,
    });
  }

  const mod = await getModById(review.modId);
  const reviews = await getReviews();

  const remainingReviews = reviews.filter(
    (item) => item.id !== id,
  );

  await saveReviews(remainingReviews);

  const destination = mod
    ? `/mods/${mod.slug}?reviewDeleted=1#reviews`
    : '/mods';

  return NextResponse.redirect(
    createSafeRedirectUrl(destination, request),
    303,
  );
}