import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getModById } from '@/lib/mods';
import { rewardFirstModView } from '@/lib/cultivation-service';
import { isSameOriginRequest } from '@/lib/security/request-security';

export async function POST(
  request: Request,
  {
    params,
  }: {
    params: Promise<{ id: string }>;
  },
) {
  if (!isSameOriginRequest(request)) {
    return new Response('Forbidden', { status: 403 });
  }

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ ok: true, granted: false });
  }

  const { id } = await params;
  const mod = await getModById(id);
  if (!mod) {
    return NextResponse.json(
      { ok: false, message: 'Không tìm thấy mod.' },
      { status: 404 },
    );
  }

  // Authors cannot farm their own mod-view reward.
  if (mod.authorId === user.id) {
    return NextResponse.json({ ok: true, granted: false });
  }

  const granted = await rewardFirstModView(user.id, mod.id);

  return NextResponse.json(
    { ok: true, granted },
    {
      headers: {
        'Cache-Control': 'no-store',
      },
    },
  );
}
