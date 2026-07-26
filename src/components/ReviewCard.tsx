'use client';

import {
  ShieldCheck,
  Trash2,
  UserRound,
} from 'lucide-react';

import type { ReviewItem } from '@/lib/types';

import StarRatingDisplay from '@/components/StarRatingDisplay';
import RichTextRenderer from '@/components/rich-text/RichTextRenderer';

type ReviewCardProps = {
  review: ReviewItem;
  canDelete: boolean;
  isAdminReview?: boolean;
  onDeleted: (reviewId: string) => void;
  onDeleteError: (message: string) => void;
};

function formatReviewDate(
  value: string,
): string {
  return new Intl.DateTimeFormat(
    'vi-VN',
    {
      dateStyle: 'medium',
      timeStyle: 'short',
    },
  ).format(new Date(value));
}

export default function ReviewCard({
  review,
  canDelete,
  isAdminReview = false,
  onDeleted,
  onDeleteError,
}: ReviewCardProps) {
  const wasEdited =
    review.updatedAt !== review.createdAt;

  async function deleteReview(): Promise<void> {
    const confirmed = window.confirm(
      'Xóa đánh giá này? Phần thưởng liên quan sẽ được hoàn lại.',
    );

    if (!confirmed) return;

    try {
      const response = await fetch(
        `/api/reviews/${review.id}/delete`,
        {
          method: 'POST',
          credentials: 'same-origin',
          cache: 'no-store',
          headers: {
            Accept: 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
          },
        },
      );
      const bodyText = await response.text();
      const result = (() => {
        if (!bodyText.trim()) return null;

        try {
          return JSON.parse(bodyText) as {
            ok?: boolean;
            message?: string;
            requestId?: string;
          };
        } catch {
          return null;
        }
      })();

      if (!response.ok || !result?.ok) {
        const requestSuffix = result?.requestId
          ? ` (mã ${result.requestId})`
          : '';

        throw new Error(
          `${result?.message || `Máy chủ trả về lỗi HTTP ${response.status}.`}${requestSuffix}`,
        );
      }

      onDeleted(review.id);
    } catch (error) {
      onDeleteError(
        error instanceof Error
          ? error.message
          : 'Không thể xóa đánh giá.',
      );
    }
  }

  return (
    <article className="rounded-2xl border border-white/10 bg-slate-950/45 p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-slate-800 text-slate-300">
            <UserRound className="h-5 w-5" />
          </div>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="truncate font-bold text-slate-100">
                {review.userName}
              </p>

              {isAdminReview && (
                <span className="inline-flex items-center gap-1 rounded-full border border-amber-400/30 bg-amber-400/10 px-2 py-0.5 text-[11px] font-bold text-amber-300">
                  <ShieldCheck className="h-3 w-3" />
                  Giới Đế
                </span>
              )}
            </div>

            <time
              dateTime={review.updatedAt}
              className="mt-1 block text-xs text-slate-500"
            >
              {formatReviewDate(review.updatedAt)}
              {wasEdited ? ' · Đã chỉnh sửa' : ''}
            </time>
          </div>
        </div>

        {canDelete && (
          <button
            type="button"
            onClick={() => void deleteReview()}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-red-400/20 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-200 transition hover:bg-red-500/20"
            title="Xóa đánh giá"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Xóa
          </button>
        )}
      </div>

      <div className="mt-4">
        <StarRatingDisplay
          value={review.rating}
          showValue
        />
      </div>

      {review.content && (
        <div className="mt-4 break-words leading-7 text-slate-300">
          <RichTextRenderer content={review.content} enableMentions />
        </div>
      )}
    </article>
  );
}
