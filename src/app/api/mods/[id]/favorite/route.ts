import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getModById } from '@/lib/mods';
import { toggleModFavorite } from '@/lib/favorites';

export async function POST(
  _request: Request,
  {
    params,
  }: {
    params: Promise<{ id: string }>;
  },
) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json(
      { ok: false },
      { status: 401 },
    );
  }

  const { id } = await params;
  const mod = await getModById(id);

  if (!mod) {
    return NextResponse.json(
      { ok: false },
      { status: 404 },
    );
  }

  const result = await toggleModFavorite(
    id,
    user.id,
  );

  return NextResponse.json({
    ok: true,
    ...result,
  });
}
