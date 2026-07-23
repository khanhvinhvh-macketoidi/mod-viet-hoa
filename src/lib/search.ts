import type { ModItem } from './types';

export type SearchableMod = {
  mod: ModItem;
  score: number;
  matchedFields: string[];
};

export function normalizeSearchText(
  value: string,
): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLocaleLowerCase('vi')
    .replace(/[^\p{L}\p{N}\s_-]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenSimilarity(
  queryToken: string,
  candidateToken: string,
): number {
  if (queryToken === candidateToken) return 1;
  if (candidateToken.startsWith(queryToken)) return 0.9;
  if (candidateToken.includes(queryToken)) return 0.75;

  const maxLength = Math.max(
    queryToken.length,
    candidateToken.length,
  );

  if (maxLength === 0) return 0;

  let previous = Array.from(
    { length: candidateToken.length + 1 },
    (_, index) => index,
  );

  for (
    let queryIndex = 1;
    queryIndex <= queryToken.length;
    queryIndex += 1
  ) {
    const current = [queryIndex];

    for (
      let candidateIndex = 1;
      candidateIndex <= candidateToken.length;
      candidateIndex += 1
    ) {
      const cost =
        queryToken[queryIndex - 1] ===
        candidateToken[candidateIndex - 1]
          ? 0
          : 1;

      current[candidateIndex] = Math.min(
        current[candidateIndex - 1] + 1,
        previous[candidateIndex] + 1,
        previous[candidateIndex - 1] + cost,
      );
    }

    previous = current;
  }

  const distance =
    previous[candidateToken.length];

  return Math.max(0, 1 - distance / maxLength);
}

function scoreField(
  queryTokens: string[],
  rawValue: string,
  weight: number,
): number {
  const value = normalizeSearchText(rawValue);

  if (!value) return 0;

  const candidateTokens = value.split(' ');
  let total = 0;

  for (const queryToken of queryTokens) {
    let best = 0;

    for (const candidateToken of candidateTokens) {
      best = Math.max(
        best,
        tokenSimilarity(
          queryToken,
          candidateToken,
        ),
      );
    }

    total += best;
  }

  if (
    value.includes(queryTokens.join(' '))
  ) {
    total += 1.5;
  }

  return total * weight;
}

export function searchMods(
  mods: ModItem[],
  query: string,
): SearchableMod[] {
  const normalizedQuery =
    normalizeSearchText(query);

  if (!normalizedQuery) {
    return mods.map((mod) => ({
      mod,
      score: 0,
      matchedFields: [],
    }));
  }

  const queryTokens =
    normalizedQuery.split(' ');

  return mods
    .map((mod) => {
      const fields = [
        {
          name: 'title',
          value: mod.title,
          weight: 8,
        },
        {
          name: 'tags',
          value: (mod.tags ?? []).join(' '),
          weight: 6,
        },
        {
          name: 'game',
          value: mod.game,
          weight: 5,
        },
        {
          name: 'category',
          value: mod.category,
          weight: 4,
        },
        {
          name: 'author',
          value: mod.author,
          weight: 3,
        },
        {
          name: 'description',
          value: mod.description,
          weight: 1.5,
        },
      ];

      let score = 0;
      const matchedFields: string[] = [];

      for (const field of fields) {
        const fieldScore = scoreField(
          queryTokens,
          field.value,
          field.weight,
        );

        if (fieldScore >= field.weight * 0.55) {
          matchedFields.push(field.name);
        }

        score += fieldScore;
      }

      return {
        mod,
        score,
        matchedFields,
      };
    })
    .filter((item) => {
      const threshold =
        queryTokens.length * 2.3;

      return item.score >= threshold;
    })
    .sort((a, b) => b.score - a.score);
}

export function getAllTags(
  mods: ModItem[],
): string[] {
  return [
    ...new Set(
      mods.flatMap((mod) => mod.tags ?? []),
    ),
  ].sort((a, b) =>
    a.localeCompare(b, 'vi'),
  );
}
