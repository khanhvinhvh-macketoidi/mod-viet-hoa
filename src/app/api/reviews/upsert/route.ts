import { NextResponse } from 'next/server';

import { getCurrentUser } from '@/lib/auth';
import {
  getModById,
  getReviews,
  saveReviews,
} from '@/lib/store';
import { createReviewNotification } from '@/lib/notifications';
import type { ReviewItem } from '@/lib/types';
import {
  CULTIVATION_POINTS,
  grantCultivation,
  revokeCultivation,
  rewardReviewCreated,
  rewardReviewContentTransition,
} from '@/lib/cultivation-service';
import { createSafeRedirectUrl } from '@/lib/production/url';

const MAX_REVIEW_LENGTH = 2000;
const REVIEW_COOLDOWN_MS = 5_000;

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

function reviewRedirect(
  request: Request,
  requestId: string,
  pathname: string,
): NextResponse {
  return withHeaders(
    NextResponse.redirect(
      createSafeRedirectUrl(pathname, request),
      303,
    ),
    requestId,
  );
}

function reviewError(
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

  return reviewRedirect(
    request,
    requestId,
    redirectPath,
  );
}

function reviewSuccess(
  request: Request,
  requestId: string,
  review: ReviewItem,
  modSlug: string,
): NextResponse {
  if (wantsJson(request)) {
    return withHeaders(
      NextResponse.json({
        ok: true,
        review,
        requestId,
      }),
      requestId,
    );
  }

  return reviewRedirect(
    request,
    requestId,
    `/mods/${modSlug}?reviewSuccess=1#reviews`,
  );
}

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

async function compensateNewReviewReward(
  review: ReviewItem,
): Promise<void> {
  await revokeCultivation({
    userId: review.userId,
    uniqueKey: `REVIEW_REWARD:${review.id}`,
    type: 'REVIEW_DELETED',
    points: CULTIVATION_POINTS.REVIEW_WITHOUT_CONTENT,
    targetId: review.id,
  }).catch(() => undefined);

  if (review.content.trim()) {
    await revokeCultivation({
      userId: review.userId,
      uniqueKey: `REVIEW_CONTENT:${review.id}`,
      type: 'REVIEW_CONTENT_REMOVED',
      points: CULTIVATION_POINTS.REVIEW_CONTENT_ADDED,
      targetId: review.id,
    }).catch(() => undefined);
  }
}

async function compensateReviewTransition(input: {
  userId: string;
  reviewId: string;
  hadContent: boolean;
  hasContent: boolean;
}): Promise<void> {
  if (input.hadContent === input.hasContent) return;

  if (input.hasContent) {
    await revokeCultivation({
      userId: input.userId,
      uniqueKey: `REVIEW_CONTENT:${input.reviewId}`,
      type: 'REVIEW_CONTENT_REMOVED',
      points: CULTIVATION_POINTS.REVIEW_CONTENT_ADDED,
      targetId: input.reviewId,
    }).catch(() => undefined);
  } else {
    await grantCultivation({
      userId: input.userId,
      type: 'REVIEW_CONTENT_ADDED',
      points: CULTIVATION_POINTS.REVIEW_CONTENT_ADDED,
      targetId: input.reviewId,
      uniqueKey: `REVIEW_CONTENT:${input.reviewId}`,
      metadata: { restoredAfterReviewSaveFailure: true },
    }).catch(() => undefined);
  }
}

export async function POST(request: Request) {
  const requestId = crypto.randomUUID();

  try {
    const user = await getCurrentUser();

    if (!user) {
      return reviewError(
        request,
        requestId,
        'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.',
        401,
        '/login',
      );
    }

    const formData = await request.formData();
    const modId = String(formData.get('modId') ?? '').trim();
    const modSlug = String(formData.get('modSlug') ?? '').trim();
    const content = String(formData.get('content') ?? '').trim();
    const rating = parseRating(formData.get('rating'));

    if (!modId || !modSlug) {
      return reviewError(
        request,
        requestId,
        'Thiếu thông tin mod.',
        400,
        '/mods?reviewError=server',
      );
    }

    const mod = await getModById(modId);

    if (!mod) {
      return reviewError(
        request,
        requestId,
        'Không tìm thấy mod.',
        404,
        '/mods?reviewError=server',
      );
    }

    if (mod.authorId === user.id) {
      return reviewError(
        request,
        requestId,
        'Không thể tự đánh giá mod của chính mình.',
        403,
        `/mods/${modSlug}?reviewError=own-mod#reviews`,
      );
    }

    if (!rating) {
      return reviewError(
        request,
        requestId,
        'Vui lòng chọn từ 1 đến 5 sao.',
        400,
        `/mods/${modSlug}?reviewError=rating#reviews`,
      );
    }

    if (content.length > MAX_REVIEW_LENGTH) {
      return reviewError(
        request,
        requestId,
        `Nội dung đánh giá không được vượt quá ${MAX_REVIEW_LENGTH} ký tự.`,
        400,
        `/mods/${modSlug}?reviewError=too-long#reviews`,
      );
    }

    const reviews = await getReviews();
    const previousReviews = [...reviews];
    const existingIndex = reviews.findIndex(
      (review) =>
        review.modId === modId &&
        review.userId === user.id,
    );

    const now = new Date().toISOString();
    let newReview: ReviewItem | null = null;
    let previousReview: ReviewItem | null = null;
    let savedReview: ReviewItem;

    if (existingIndex >= 0) {
      const existingReview = reviews[existingIndex];
      previousReview = existingReview;
      const elapsed =
        Date.now() -
        new Date(existingReview.updatedAt).getTime();

      if (elapsed < REVIEW_COOLDOWN_MS) {
        const retryAfterSeconds = Math.max(
          1,
          Math.ceil((REVIEW_COOLDOWN_MS - elapsed) / 1000),
        );
        const response = reviewError(
          request,
          requestId,
          'Đạo hữu thao tác quá nhanh. Hãy chờ vài giây rồi thử lại.',
          429,
          `/mods/${modSlug}?reviewError=too-fast#reviews`,
        );
        response.headers.set(
          'Retry-After',
          String(retryAfterSeconds),
        );
        return response;
      }

      savedReview = {
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
      reviews[existingIndex] = savedReview;
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
      savedReview = newReview;
      reviews.push(newReview);
    }

    await saveReviews(reviews);

    try {
      if (newReview) {
        await rewardReviewCreated({
          userId: user.id,
          reviewId: newReview.id,
          hasContent: Boolean(newReview.content.trim()),
        });
      } else if (previousReview) {
        await rewardReviewContentTransition({
          userId: user.id,
          reviewId: previousReview.id,
          hadContent: Boolean(previousReview.content.trim()),
          hasContent: Boolean(content.trim()),
        });
      }
    } catch (cultivationError) {
      await saveReviews(previousReviews);

      if (newReview) {
        await compensateNewReviewReward(newReview);
      } else if (previousReview) {
        await compensateReviewTransition({
          userId: user.id,
          reviewId: previousReview.id,
          hadContent: Boolean(previousReview.content.trim()),
          hasContent: Boolean(content.trim()),
        });
      }

      throw cultivationError;
    }

    if (newReview) {
      try {
        await createReviewNotification({
          review: newReview,
          mod,
        });
      } catch (notificationError) {
        console.error(
          `[${requestId}] Luận đạo đã được lưu nhưng không thể tạo notification:`,
          notificationError,
        );
      }
    }

    return reviewSuccess(
      request,
      requestId,
      savedReview,
      modSlug,
    );
  } catch (error) {
    console.error(`[${requestId}] Lỗi lưu luận đạo:`, error);

    return reviewError(
      request,
      requestId,
      'Không thể lưu đánh giá.',
      500,
      '/mods?reviewError=server',
    );
  }
}
