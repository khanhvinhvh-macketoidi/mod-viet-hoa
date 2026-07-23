import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { canManageMod } from '@/lib/permissions';
import {
  getModById,
  getMods,
  saveMods,
} from '@/lib/mods';

function normalizeTags(values: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const rawValue of values) {
    const value = rawValue
      .trim()
      .replace(/\s+/g, ' ')
      .slice(0, 40);

    const key =
      value.toLocaleLowerCase('vi');

    if (
      value &&
      !seen.has(key) &&
      result.length < 12
    ) {
      seen.add(key);
      result.push(value);
    }
  }

  return result;
}

export async function POST(
  request: Request,
  {
    params,
  }: {
    params: Promise<{ id: string }>;
  },
) {
  const user = await getCurrentUser();

  if (!user) {
    return new Response('Unauthorized', {
      status: 401,
    });
  }

  const { id } = await params;
  const mod = await getModById(id);

  if (!mod) {
    return new Response('Not found', {
      status: 404,
    });
  }

  if (!canManageMod(user, mod)) {
    return new Response('Forbidden', {
      status: 403,
    });
  }

  const formData = await request.formData();
  const tags = normalizeTags(
    formData
      .getAll('tags')
      .map(String),
  );

  const mods = await getMods();
  const now = new Date().toISOString();

  await saveMods(
    mods.map((item) =>
      item.id === id
        ? {
            ...item,
            tags,
            updatedAt: now,
          }
        : item,
    ),
  );

  return NextResponse.redirect(
    new URL(
      `/mods/${mod.slug}`,
      request.url,
    ),
    303,
  );
}
