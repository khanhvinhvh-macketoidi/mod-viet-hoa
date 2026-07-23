import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { readJson, writeJson } from './json-store';
import { normalizeSearchText } from './search';
import type { SearchAnalyticsItem } from './types';

const analyticsPath = path.join(
  process.cwd(),
  'data',
  'search-analytics.json',
);

export async function getSearchAnalytics(): Promise<
  SearchAnalyticsItem[]
> {
  return readJson<SearchAnalyticsItem[]>(
    analyticsPath,
    [],
  );
}

export async function recordSearchQuery(input: {
  query: string;
  resultCount: number;
  userId?: string;
}): Promise<void> {
  const query = input.query.trim();

  if (query.length < 2) return;

  const items = await getSearchAnalytics();
  const normalizedQuery =
    normalizeSearchText(query);
  const now = Date.now();

  const duplicate = items.some(
    (item) =>
      item.normalizedQuery ===
        normalizedQuery &&
      item.userId === input.userId &&
      now -
        new Date(item.createdAt).getTime() <
        60_000,
  );

  if (duplicate) return;

  items.push({
    id: randomUUID(),
    query,
    normalizedQuery,
    resultCount: input.resultCount,
    userId: input.userId,
    createdAt: new Date().toISOString(),
  });

  await writeJson(
    analyticsPath,
    items.slice(-5000),
  );
}

export async function getTopSearchQueries(
  limit = 10,
): Promise<
  Array<{
    query: string;
    count: number;
  }>
> {
  const items = await getSearchAnalytics();
  const counts = new Map<
    string,
    {
      query: string;
      count: number;
    }
  >();

  for (const item of items) {
    const current = counts.get(
      item.normalizedQuery,
    );

    if (current) {
      current.count += 1;
    } else {
      counts.set(item.normalizedQuery, {
        query: item.query,
        count: 1,
      });
    }
  }

  return [...counts.values()]
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}
