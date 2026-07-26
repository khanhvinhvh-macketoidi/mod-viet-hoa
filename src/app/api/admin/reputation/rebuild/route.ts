import { revalidatePath } from 'next/cache';
import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { isSameOriginRequest } from '@/lib/security/request-security';
import {
  getReputationIntegrityReport,
  rebuildAllReputationFromLogs,
  rebuildUserReputationFromLogs,
} from '@/lib/reputation-service';

type Body = {
  allUsers?: boolean;
  userId?: string;
  confirm?: string;
};

export async function GET() {
  const admin = await getCurrentUser();
  if (admin?.role !== 'ADMIN') {
    return new Response('Forbidden', { status: 403 });
  }

  const report = await getReputationIntegrityReport();
  return NextResponse.json({ ok: true, ...report });
}

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) {
    return new Response('Forbidden', { status: 403 });
  }

  const admin = await getCurrentUser();
  if (admin?.role !== 'ADMIN') {
    return new Response('Forbidden', { status: 403 });
  }

  const body = (await request.json().catch(() => ({}))) as Body;

  try {
    if (body.allUsers) {
      if (body.confirm !== 'REBUILD_REPUTATION_FROM_LOGS') {
        return NextResponse.json(
          {
            ok: false,
            message: 'Thiếu mã xác nhận REBUILD_REPUTATION_FROM_LOGS.',
          },
          { status: 400 },
        );
      }

      const result = await rebuildAllReputationFromLogs();
      revalidatePath('/admin/reputation');
      revalidatePath('/profile');
      revalidatePath('/authors/[slug]', 'page');
      return NextResponse.json({ ok: true, ...result });
    }

    const userId = String(body.userId ?? admin.id).trim();
    const result = await rebuildUserReputationFromLogs(userId);
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
            : 'Không thể rebuild Danh vọng.',
      },
      { status: 400 },
    );
  }
}
