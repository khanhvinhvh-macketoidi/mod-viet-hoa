import { NextResponse } from 'next/server';

import { getCurrentUser } from '@/lib/auth';
import {
  getModById,
  getReviews,
  saveReviews,
} from '@/lib/store';
import { createReviewNotification } from '@/lib/notifications';
import type { ReviewItem } from '@/lib/types';


import { createSafeRedirectUrl } from '@/lib/production/url';
const MAX_REVIEW_LENGTH = 2000;
const REVIEW_COOLDOWN_MS = 5_000;

function parseRating(
  value: FormDataEntryValue | null,
): 1 | 2 | 3 | 4 | 5 | null {
  const rating = Number(value);

  if (
    !Number.isInteger(rating) ||
    rating < 1 ||
    rating > 5
  ) {
    return null;
  }

  return rating as 1 | 2 | 3 | 4 | 5;
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

    const modId = String(formData.get('modId') ?? '').trim();
    const modSlug = String(formData.get('modSlug') ?? '').trim();
    const content = String(formData.get('content') ?? '').trim();
    const rating = parseRating(formData.get('rating'));

    if (!modId || !modSlug) {
      throw new Error('Thiếu thông tin mod');
    }

    const mod = await getModById(modId);

    if (!mod) {
      return new Response('Mod not found', {
        status: 404,
      });
    }

    if (!rating) {
      return NextResponse.redirect(
        createSafeRedirectUrl(
          `/mods/${modSlug}?reviewError=rating#reviews`, request),
        303,
      );
    }

    if (content.length > MAX_REVIEW_LENGTH) {
      return NextResponse.redirect(
        createSafeRedirectUrl(
          `/mods/${modSlug}?reviewError=too-long#reviews`, request),
        303,
      );
    }

    const reviews = await getReviews();
    const existingIndex = reviews.findIndex(
      (review) =>
        review.modId === modId &&
        review.userId === user.id,
    );

    const now = new Date().toISOString();
    let newReview: ReviewItem | null = null;

    if (existingIndex >= 0) {
      const existingReview = reviews[existingIndex];
      const elapsed =
        Date.now() -
        new Date(existingReview.updatedAt).getTime();

      if (elapsed < REVIEW_COOLDOWN_MS) {
        return NextResponse.redirect(
          createSafeRedirectUrl(
            `/mods/${modSlug}?reviewError=too-fast#reviews`, request),
          303,
        );
      }

      reviews[existingIndex] = {
        ...existingReview,
        rating,
        content,
        userName:
          user.profile?.displayName?.trim() ||
          user.name?.trim() ||
          user.email ||
          'Thành viên',
        updatedAt: now,
      };
    } else {
      newReview = {
        id: crypto.randomUUID(),
        modId,
        userId: user.id,
        userName:
          user.profile?.displayName?.trim() ||
          user.name?.trim() ||
          user.email ||
          'Thành viên',
        rating,
        content,
        createdAt: now,
        updatedAt: now,
      };

      reviews.push(newReview);
    }

    await saveReviews(reviews);

    /*
     * Chỉ luận đạo mới tạo notification.
     * Chỉnh sửa luận đạo cũ không gửi lại để tránh spam.
     */
    if (newReview) {
      try {
        await createReviewNotification({
          review: newReview,
          mod,
        });
      } catch (notificationError) {
        console.error(
          'Luận đạo đã được lưu nhưng không thể tạo notification:',
          notificationError,
        );
      }
    }

    return NextResponse.redirect(
      createSafeRedirectUrl(
        `/mods/${modSlug}?reviewSuccess=1#reviews`, request),
      303,
    );
  } catch (error) {
    console.error('Lỗi lưu luận đạo:', error);

    return NextResponse.redirect(
      createSafeRedirectUrl('/mods?reviewError=server', request),
      303,
    );
  }
}
