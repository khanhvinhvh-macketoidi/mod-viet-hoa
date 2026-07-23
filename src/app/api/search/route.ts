import { NextResponse } from 'next/server';
import { getMods } from '@/lib/mods';
import { searchMods } from '@/lib/search';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const query =
    url.searchParams.get('q')?.trim() ?? '';

  if (query.length < 2) {
    return NextResponse.json({
      results: [],
    });
  }

  const mods = await getMods();
  const results = searchMods(
    mods,
    query,
  )
    .slice(0, 7)
    .map(({ mod }) => ({
      id: mod.id,
      title: mod.title,
      slug: mod.slug,
      game: mod.game,
      category: mod.category,
      tags: mod.tags ?? [],
    }));

  return NextResponse.json({ results });
}
