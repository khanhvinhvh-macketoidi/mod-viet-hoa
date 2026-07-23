import type { ReviewItem } from './types';
import { reviewsPath } from './data-paths';
import { readJson, writeJson } from './json-store';

export type ReviewStats = {
  average: number;
  count: number;
};

export async function getReviews(): Promise<ReviewItem[]> {
  return readJson<ReviewItem[]>(reviewsPath, []);
}

export async function saveReviews(reviews: ReviewItem[]): Promise<void> {
  await writeJson(reviewsPath, reviews);
}

export async function getReviewsByModId(
  modId: string,
): Promise<ReviewItem[]> {
  return (await getReviews())
    .filter((review) => review.modId === modId)
    .sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    );
}

export async function getReviewById(
  id: string,
): Promise<ReviewItem | undefined> {
  return (await getReviews()).find((review) => review.id === id);
}

export async function getReviewByUserAndMod(
  userId: string,
  modId: string,
): Promise<ReviewItem | undefined> {
  return (await getReviews()).find(
    (review) => review.userId === userId && review.modId === modId,
  );
}

export function calculateReviewStats(reviews: ReviewItem[]) {
  const distribution: Record<1 | 2 | 3 | 4 | 5, number> = {
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
    average: count > 0 ? Math.round((total / count) * 10) / 10 : 0,
    count,
    distribution,
  };
}

export async function getReviewStatsMap(): Promise<
  Record<string, ReviewStats>
> {
  const totals: Record<string, { total: number; count: number }> = {};

  for (const review of await getReviews()) {
    totals[review.modId] ??= { total: 0, count: 0 };
    totals[review.modId].total += review.rating;
    totals[review.modId].count += 1;
  }

  return Object.fromEntries(
    Object.entries(totals).map(([modId, value]) => [
      modId,
      {
        average: Math.round((value.total / value.count) * 10) / 10,
        count: value.count,
      },
    ]),
  );
}
