import { revalidatePath } from 'next/cache';
import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { isSameOriginRequest } from '@/lib/security/request-security';
import { setReputationStatus } from '@/lib/reputation-service';
import type { ReputationStatus } from '@/lib/types';

type Body = {
  userId?: string;
  status?: ReputationStatus;
};

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) {
    return new Response('Forbidden', { status: 403 });
  }

  const admin = await getCurrentUser();
  if (admin?.role !== 'ADMIN') {
    return new Response('Forbidden', { status: 403 });
  }

  const body = (await request.json().catch(() => ({}))) as Body;
  const userId = String(body.userId ?? '').trim();
  const status = body.status;

  if (!userId || !['ACTIVE', 'FROZEN'].includes(String(status))) {
    return NextResponse.json(
      { ok: false, message: 'Dữ liệu trạng thái không hợp lệ.' },
      { status: 400 },
    );
  }

  try {
    const reputation = await setReputationStatus({
      userId,
      status: status as ReputationStatus,
      adminUserId: admin.id,
    });

    revalidatePath('/admin/reputation');
    revalidatePath('/profile');
    revalidatePath('/authors/[slug]', 'page');
    return NextResponse.json({ ok: true, reputation });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message:
          error instanceof Error
            ? error.message
            : 'Không thể cập nhật trạng thái Danh vọng.',
      },
      { status: 400 },
    );
  }
}
