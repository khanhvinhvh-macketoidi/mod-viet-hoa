import type { AuthorStats } from './types';
import { getComments } from './comments';
import { getMods } from './mods';
import { getReviews } from './reviews';

const EMPTY_STATS: AuthorStats = {
  publishedModCount: 0,
  totalDownloads: 0,
  totalReviews: 0,
  totalComments: 0,
  averageRating: 0,
};

export async function getAuthorStatsMap(
  authorIds: string[],
): Promise<Map<string, AuthorStats>> {
  const [mods, reviews, comments] = await Promise.all([
    getMods(),
    getReviews(),
    getComments(),
  ]);

  const wantedIds = new Set(authorIds);
  const stats = new Map<string, AuthorStats>();
  const modAuthorById = new Map<string, string>();
  const ratingTotals = new Map<string, number>();

  authorIds.forEach((authorId) => stats.set(authorId, { ...EMPTY_STATS }));

  for (const mod of mods) {
    const authorId = mod.authorId;
    if (!authorId || !wantedIds.has(authorId)) continue;

    modAuthorById.set(mod.id, authorId);
    const current = stats.get(authorId) ?? { ...EMPTY_STATS };
    current.publishedModCount += 1;
    current.totalDownloads += mod.downloads;
    stats.set(authorId, current);
  }

  for (const review of reviews) {
    const authorId = modAuthorById.get(review.modId);
    if (!authorId) continue;

    const current = stats.get(authorId) ?? { ...EMPTY_STATS };
    current.totalReviews += 1;
    ratingTotals.set(authorId, (ratingTotals.get(authorId) ?? 0) + review.rating);
    stats.set(authorId, current);
  }

  for (const comment of comments) {
    const authorId = modAuthorById.get(comment.modId);
    if (!authorId) continue;

    const current = stats.get(authorId) ?? { ...EMPTY_STATS };
    current.totalComments += 1;
    stats.set(authorId, current);
  }

  for (const [authorId, current] of stats) {
    current.averageRating = current.totalReviews
      ? Math.round(((ratingTotals.get(authorId) ?? 0) / current.totalReviews) * 10) / 10
      : 0;
  }

  return stats;
}

export async function getAuthorStats(authorId: string): Promise<AuthorStats> {
  return (await getAuthorStatsMap([authorId])).get(authorId) ?? { ...EMPTY_STATS };
}
