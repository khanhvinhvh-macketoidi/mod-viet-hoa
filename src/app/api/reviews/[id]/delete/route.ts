import { NextResponse } from 'next/server';

import { getCurrentUser } from '@/lib/auth';
import {
  getModById,
  getReviewById,
  getReviews,
  saveReviews,
} from '@/lib/store';
import { createSafeRedirectUrl } from '@/lib/production/url';
import {
  CULTIVATION_POINTS,
  grantCultivation,
  revokeCultivation,
} from '@/lib/cultivation-service';

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

function mutationError(
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

function mutationSuccess(
  request: Request,
  requestId: string,
  reviewId: string,
  destination: string,
): NextResponse {
  if (wantsJson(request)) {
    return withHeaders(
      NextResponse.json({
        ok: true,
        reviewId,
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

  try {
    const user = await getCurrentUser();

    if (!user) {
      return mutationError(
        request,
        requestId,
        'Phiên đăng nhập đã hết hạn.',
        401,
        '/login',
      );
    }

    const { id } = await params;
    const review = await getReviewById(id);

    if (!review) {
      return mutationError(
        request,
        requestId,
        'Không tìm thấy đánh giá.',
        404,
        '/mods?reviewError=server',
      );
    }

    const canDelete =
      review.userId === user.id ||
      user.role === 'ADMIN';

    if (!canDelete) {
      return mutationError(
        request,
        requestId,
        'Bạn không có quyền xóa đánh giá này.',
        403,
        '/mods?reviewError=server',
      );
    }

    const mod = await getModById(review.modId);
    const destination = mod
      ? `/mods/${mod.slug}?reviewDeleted=1#reviews`
      : '/mods';
    const reviews = await getReviews();
    const remainingReviews = reviews.filter(
      (item) => item.id !== id,
    );
    const compensations: Array<() => Promise<unknown>> = [];

    try {
      const baseReversal = await revokeCultivation({
        userId: review.userId,
        uniqueKey: `REVIEW_REWARD:${review.id}`,
        type: 'REVIEW_DELETED',
        points: CULTIVATION_POINTS.REVIEW_WITHOUT_CONTENT,
        targetId: review.id,
      });

      if (baseReversal.reversed) {
        compensations.push(() =>
          grantCultivation({
            userId: review.userId,
            type: 'REVIEW_CREATED',
            points: CULTIVATION_POINTS.REVIEW_WITHOUT_CONTENT,
            targetId: review.id,
            uniqueKey: `REVIEW_REWARD:${review.id}`,
          }),
        );
      }

      if (review.content.trim()) {
        const contentReversal = await revokeCultivation({
          userId: review.userId,
          uniqueKey: `REVIEW_CONTENT:${review.id}`,
          type: 'REVIEW_CONTENT_REMOVED',
          points: CULTIVATION_POINTS.REVIEW_CONTENT_ADDED,
          targetId: review.id,
        });

        if (contentReversal.reversed) {
          compensations.push(() =>
            grantCultivation({
              userId: review.userId,
              type: 'REVIEW_CONTENT_ADDED',
              points: CULTIVATION_POINTS.REVIEW_CONTENT_ADDED,
              targetId: review.id,
              uniqueKey: `REVIEW_CONTENT:${review.id}`,
            }),
          );
        }
      }

      try {
        await saveReviews(remainingReviews);
      } catch (dataError) {
        await saveReviews(reviews).catch(() => undefined);
        await runCompensations(compensations);
        throw dataError;
      }
    } catch (error) {
      await runCompensations(compensations);
      throw error;
    }

    return mutationSuccess(
      request,
      requestId,
      review.id,
      destination,
    );
  } catch (error) {
    console.error(
      `[${requestId}] Không thể xóa luận đạo và hoàn XP:`,
      error,
    );

    return mutationError(
      request,
      requestId,
      'Không thể xóa đánh giá.',
      500,
      '/mods?reviewError=server',
    );
  }
}
