import type { ModItem } from './types';

export type ModSignals = {
  favoriteCount?: number;
  ratingAverage?: number;
  ratingCount?: number;
  commentCount?: number;
};

function overlapCount(
  left: string[] = [],
  right: string[] = [],
): number {
  const rightSet = new Set(
    right.map((item) =>
      item.toLocaleLowerCase('vi'),
    ),
  );

  return left.filter((item) =>
    rightSet.has(
      item.toLocaleLowerCase('vi'),
    ),
  ).length;
}

export function getRelatedMods(
  source: ModItem,
  mods: ModItem[],
  signals: Record<string, ModSignals>,
  limit = 6,
): ModItem[] {
  return mods
    .filter((mod) => mod.id !== source.id)
    .map((mod) => {
      const stats = signals[mod.id] ?? {};
      let score = 0;

      if (mod.game === source.game) score += 100;
      if (mod.category === source.category) {
        score += 45;
      }

      score +=
        overlapCount(
          source.tags,
          mod.tags,
        ) * 35;

      if (
        source.authorId &&
        mod.authorId === source.authorId
      ) {
        score += 20;
      }

      score += Math.min(
        stats.favoriteCount ?? 0,
        100,
      ) * 0.5;

      score +=
        (stats.ratingAverage ?? 0) *
        Math.log10(
          (stats.ratingCount ?? 0) + 1,
        ) *
        3;

      return { mod, score };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((item) => item.mod);
}

export function getTrendingScore(
  mod: ModItem,
  signals: ModSignals,
  days = 7,
): number {
  const ageDays = Math.max(
    1,
    (
      Date.now() -
      new Date(mod.createdAt).getTime()
    ) /
      86_400_000,
  );

  const freshness =
    ageDays <= days
      ? 2
      : 1 / Math.log2(ageDays + 1);

  return (
    (
      mod.downloads * 0.4 +
      (signals.favoriteCount ?? 0) * 8 +
      (signals.commentCount ?? 0) * 3 +
      (signals.ratingAverage ?? 0) *
        (signals.ratingCount ?? 0) *
        2
    ) * freshness
  );
}
