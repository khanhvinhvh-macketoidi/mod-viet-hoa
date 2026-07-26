import { revalidatePath } from 'next/cache';
import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { isSameOriginRequest } from '@/lib/security/request-security';
import { adjustReputationByAdmin } from '@/lib/reputation-service';

type Body = {
  userId?: string;
  points?: number;
  reason?: string;
};

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) {
    return new Response('Forbidden', { status: 403 });
  }

  const admin = await getCurrentUser();
  if (admin?.role !== 'ADMIN') {
    return new Response('Forbidden', { status: 403 });
  }

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json(
      { ok: false, message: 'Dữ liệu không hợp lệ.' },
      { status: 400 },
    );
  }

  try {
    const result = await adjustReputationByAdmin({
      userId: String(body.userId ?? '').trim(),
      adminUserId: admin.id,
      points: Number(body.points ?? 0),
      reason: String(body.reason ?? ''),
    });

    revalidatePath('/admin/reputation');
    revalidatePath('/profile');
    revalidatePath('/authors/[slug]', 'page');

    return NextResponse.json({ ok: true, result });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message:
          error instanceof Error
            ? error.message
            : 'Không thể điều chỉnh Danh vọng.',
      },
      { status: 400 },
    );
  }
}
