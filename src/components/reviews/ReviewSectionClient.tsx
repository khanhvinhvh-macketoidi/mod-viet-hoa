'use client';

import {
  useMemo,
  useState,
} from 'react';

import ReviewCard from '@/components/ReviewCard';
import ReviewForm from '@/components/ReviewForm';
import ReviewSummary from '@/components/ReviewSummary';
import type { ReviewItem } from '@/lib/types';

type Props = {
  initialReviews: ReviewItem[];
  modId: string;
  modSlug: string;
  isLoggedIn: boolean;
  currentUserId?: string;
  userName?: string;
  isAdmin: boolean;
  adminUserIds: string[];
};

type Notice = {
  message: string;
  kind: 'success' | 'error';
} | null;

function calculateStats(reviews: ReviewItem[]) {
  const distribution: Record<
    1 | 2 | 3 | 4 | 5,
    number
  > = {
    1: 0,
    2: 0,
    3: 0,
    4: 0,
    5: 0,
  };

  let total = 0;

  for (const review of reviews) {
    total += review.rating;
    distribution[review.rating] += 1;
  }

  const count = reviews.length;

  return {
    average:
      count > 0
        ? Math.round((total / count) * 10) / 10
        : 0,
    count,
    distribution,
  };
}

export default function ReviewSectionClient({
  initialReviews,
  modId,
  modSlug,
  isLoggedIn,
  currentUserId,
  userName,
  isAdmin,
  adminUserIds,
}: Props) {
  const [reviews, setReviews] =
    useState(initialReviews);
  const [notice, setNotice] =
    useState<Notice>(null);

  const stats = useMemo(
    () => calculateStats(reviews),
    [reviews],
  );

  const currentUserReview = currentUserId
    ? reviews.find(
        (review) =>
          review.userId === currentUserId,
      )
    : undefined;

  function handleSaved(review: ReviewItem): void {
    setReviews((items) => {
      const exists = items.some(
        (item) => item.id === review.id,
      );
      const next = exists
        ? items.map((item) =>
            item.id === review.id
              ? review
              : item,
          )
        : [...items, review];

      return next.sort(
        (left, right) =>
          new Date(right.updatedAt).getTime() -
          new Date(left.updatedAt).getTime(),
      );
    });
    setNotice({
      message: currentUserReview
        ? 'Đã cập nhật đánh giá.'
        : 'Đánh giá đã được ghi nhận.',
      kind: 'success',
    });
  }

  function handleDeleted(reviewId: string): void {
    setReviews((items) =>
      items.filter((item) => item.id !== reviewId),
    );
    setNotice({
      message: 'Đã xóa đánh giá.',
      kind: 'success',
    });
  }

  return (
    <>
      {notice && (
        <div
          role={notice.kind === 'error' ? 'alert' : 'status'}
          className={
            notice.kind === 'error'
              ? 'mt-5 rounded-xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-200'
              : 'mt-5 rounded-xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200'
          }
        >
          {notice.message}
        </div>
      )}

      <div className="mt-6">
        <ReviewSummary
          average={stats.average}
          count={stats.count}
          distribution={stats.distribution}
        />
      </div>

      <div className="mt-6">
        <ReviewForm
          modId={modId}
          modSlug={modSlug}
          isLoggedIn={isLoggedIn}
          userName={userName}
          existingReview={currentUserReview}
          onSaved={handleSaved}
        />
      </div>

      <div className="mt-8 space-y-4">
        {reviews.map((review) => (
          <ReviewCard
            key={review.id}
            review={review}
            canDelete={
              isAdmin ||
              currentUserId === review.userId
            }
            isAdminReview={adminUserIds.includes(
              review.userId,
            )}
            onDeleted={handleDeleted}
            onDeleteError={(message) =>
              setNotice({
                message,
                kind: 'error',
              })
            }
          />
        ))}

        {reviews.length === 0 && (
          <div className="rounded-2xl border border-dashed border-white/10 px-5 py-12 text-center">
            <p className="font-semibold text-slate-300">
              Chưa có đánh giá
            </p>

            <p className="mt-2 text-sm text-slate-500">
              Hãy là người đầu tiên giám định bí thuật này.
            </p>
          </div>
        )}
      </div>
    </>
  );
}
