'use client';

import {
  FormEvent,
  useState,
} from 'react';

import {
  LogIn,
  Send,
  Star,
} from 'lucide-react';

import type {
  ReviewItem,
} from '@/lib/types';

type ReviewFormProps = {
  modId: string;
  modSlug: string;

  isLoggedIn: boolean;
  userName?: string;

  existingReview?: ReviewItem;
};

const MAX_LENGTH = 2000;

const ratingLabels: Record<number, string> = {
  1: 'Rất tệ',
  2: 'Chưa tốt',
  3: 'Bình thường',
  4: 'Tốt',
  5: 'Xuất sắc',
};

export default function ReviewForm({
  modId,
  modSlug,
  isLoggedIn,
  userName,
  existingReview,
}: ReviewFormProps) {
  const [rating, setRating] = useState(
    existingReview?.rating ?? 0,
  );

  const [hoverRating, setHoverRating] =
    useState(0);

  const [content, setContent] = useState(
    existingReview?.content ?? '',
  );

  const [submitting, setSubmitting] =
    useState(false);

  if (!isLoggedIn) {
    return (
      <div className="rounded-2xl border border-amber-400/20 bg-amber-400/5 p-5">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-400/10 text-amber-400">
            <LogIn className="h-5 w-5" />
          </div>

          <div>
            <p className="font-bold text-slate-100">
              Đăng nhập để đánh giá
            </p>

            <p className="mt-1 text-sm leading-6 text-slate-400">
              Mỗi tài khoản chỉ có một đánh giá cho
              mỗi mod và có thể cập nhật lại sau.
            </p>

            <a
              href={`/login?next=${encodeURIComponent(
                `/mods/${modSlug}#reviews`,
              )}`}
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-amber-400 px-4 py-2.5 font-bold text-slate-950 transition hover:bg-amber-300"
            >
              <LogIn className="h-4 w-4" />
              Đăng nhập
            </a>
          </div>
        </div>
      </div>
    );
  }

  function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ): void {
    if (rating < 1 || rating > 5) {
      event.preventDefault();
      return;
    }

    setSubmitting(true);
  }

  const visibleRating =
    hoverRating || rating;

  return (
    <form
      action="/api/reviews/upsert"
      method="post"
      onSubmit={handleSubmit}
      className="rounded-2xl border border-white/10 bg-slate-950/50 p-5"
    >
      <input
        type="hidden"
        name="modId"
        value={modId}
      />

      <input
        type="hidden"
        name="modSlug"
        value={modSlug}
      />

      <input
        type="hidden"
        name="rating"
        value={rating}
      />

      <div>
        <p className="font-bold text-slate-100">
          {existingReview
            ? 'Cập nhật đánh giá của bạn'
            : 'Đánh giá bản mod'}
        </p>

        <p className="mt-1 text-xs text-slate-500">
          Đang đánh giá với tên{' '}
          {userName || 'Tán Tu'}
        </p>
      </div>

      <fieldset className="mt-5">
        <legend className="text-sm font-semibold text-slate-300">
          Chọn số sao
        </legend>

        <div
          className="mt-3 flex flex-wrap items-center gap-3"
          onMouseLeave={() => setHoverRating(0)}
        >
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((value) => {
              const selected =
                visibleRating >= value;

              return (
                <button
                  key={value}
                  type="button"
                  onMouseEnter={() =>
                    setHoverRating(value)
                  }
                  onFocus={() =>
                    setHoverRating(value)
                  }
                  onBlur={() =>
                    setHoverRating(0)
                  }
                  onClick={() =>
                    setRating(value)
                  }
                  className="rounded-lg p-1 transition hover:scale-110 focus:outline-none focus:ring-2 focus:ring-amber-400/40"
                  aria-label={`${value} sao`}
                >
                  <Star
                    className={`
                      h-8 w-8 transition
                      ${
                        selected
                          ? 'fill-amber-400 text-amber-400'
                          : 'fill-transparent text-slate-600'
                      }
                    `}
                  />
                </button>
              );
            })}
          </div>

          <span
            className={`
              min-w-24 text-sm font-semibold
              ${
                visibleRating > 0
                  ? 'text-amber-300'
                  : 'text-slate-500'
              }
            `}
          >
            {visibleRating > 0
              ? ratingLabels[visibleRating]
              : 'Chưa chọn'}
          </span>
        </div>
      </fieldset>

      <textarea
        name="content"
        value={content}
        onChange={(event) =>
          setContent(event.target.value)
        }
        maxLength={MAX_LENGTH}
        rows={5}
        placeholder="Viết nhận xét về chất lượng bản mod, độ ổn định hoặc mức độ hoàn thiện... (không bắt buộc)"
        className="mt-5 min-h-32 w-full resize-y rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-amber-400/50 focus:ring-2 focus:ring-amber-400/10"
      />

      <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p
          className={
            content.length >= MAX_LENGTH
              ? 'text-xs text-red-300'
              : 'text-xs text-slate-500'
          }
        >
          {content.length}/{MAX_LENGTH} ký tự
        </p>

        <button
          type="submit"
          disabled={
            submitting ||
            rating < 1
          }
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-400 px-5 py-3 font-bold text-slate-950 transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Send className="h-4 w-4" />

          {submitting
            ? 'Đang lưu...'
            : existingReview
              ? 'Cập nhật đánh giá'
              : 'Gửi đánh giá'}
        </button>
      </div>
    </form>
  );
}