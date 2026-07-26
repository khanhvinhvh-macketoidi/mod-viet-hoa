import { revalidatePath } from 'next/cache';
import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { isSameOriginRequest } from '@/lib/security/request-security';
import {
  getCultivationIntegrityReport,
  rebuildAllCultivationFromLogs,
  rebuildUserCultivationFromLogs,
} from '@/lib/cultivation-service';

type RebuildBody = {
  allUsers?: boolean;
  userId?: string;
  confirm?: string;
};

export async function GET() {
  const admin = await getCurrentUser();
  if (admin?.role !== 'ADMIN') {
    return new Response('Forbidden', { status: 403 });
  }

  const report = await getCultivationIntegrityReport();
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

  let body: RebuildBody = {};
  try {
    body = (await request.json()) as RebuildBody;
  } catch {
    // Empty body rebuilds the current admin account.
  }

  try {
    if (body.allUsers) {
      if (body.confirm !== 'REBUILD_FROM_LOGS') {
        return NextResponse.json(
          {
            ok: false,
            message: 'Thiếu mã xác nhận REBUILD_FROM_LOGS.',
          },
          { status: 400 },
        );
      }

      const result = await rebuildAllCultivationFromLogs();
      revalidatePath('/admin/cultivation');
      revalidatePath('/profile');
      revalidatePath('/authors/[slug]', 'page');
      return NextResponse.json({ ok: true, ...result });
    }

    const userId = body.userId?.trim() || admin.id;
    const result = await rebuildUserCultivationFromLogs(userId);
    revalidatePath('/admin/cultivation');
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
            : 'Không thể rebuild cultivation.',
      },
      { status: 400 },
    );
  }
}
