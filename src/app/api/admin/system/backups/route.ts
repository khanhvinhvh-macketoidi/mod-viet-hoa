import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import {
  consumeRateLimit,
  getClientIp,
  isSameOriginRequest,
} from '@/lib/security/request-security';
import { createRequestId } from '@/lib/stability/request-id';
import {
  createRuntimeBackup,
  listRuntimeBackups,
} from '@/lib/system-operations';

export const dynamic = 'force-dynamic';

export async function GET() {
  const admin = await getCurrentUser();

  if (admin?.role !== 'ADMIN') {
    return NextResponse.json(
      { ok: false, message: 'Không có quyền truy cập.' },
      { status: 403 },
    );
  }

  return NextResponse.json(
    { ok: true, backups: await listRuntimeBackups() },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}

export async function POST(request: Request) {
  const requestId = createRequestId();

  if (!isSameOriginRequest(request)) {
    return NextResponse.json(
      { ok: false, message: 'Yêu cầu không hợp lệ.', requestId },
      { status: 403 },
    );
  }

  const admin = await getCurrentUser();

  if (admin?.role !== 'ADMIN') {
    return NextResponse.json(
      { ok: false, message: 'Không có quyền truy cập.', requestId },
      { status: 403 },
    );
  }

  const rateLimit = consumeRateLimit({
    key: `admin-system-backup:${admin.id}:${getClientIp(request)}`,
    limit: 5,
    windowMs: 60 * 60 * 1_000,
  });

  if (!rateLimit.allowed) {
    return NextResponse.json(
      {
        ok: false,
        message: `Vui lòng chờ ${rateLimit.retryAfterSeconds} giây trước khi tạo backup mới.`,
        requestId,
      },
      {
        status: 429,
        headers: { 'Retry-After': String(rateLimit.retryAfterSeconds) },
      },
    );
  }

  const body = (await request.json().catch(() => ({}))) as {
    reason?: unknown;
  };
  const reason = String(body.reason ?? '')
    .normalize('NFKC')
    .replace(/\u0000/g, '')
    .trim()
    .slice(0, 500);

  try {
    const backup = await createRuntimeBackup({
      actorUserId: admin.id,
      requestId,
      reason: reason || undefined,
    });

    return NextResponse.json(
      { ok: true, backup, requestId },
      { headers: { 'Cache-Control': 'no-store', 'X-Request-Id': requestId } },
    );
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message:
          error instanceof Error ? error.message : 'Không thể tạo backup.',
        requestId,
      },
      {
        status: 500,
        headers: { 'Cache-Control': 'no-store', 'X-Request-Id': requestId },
      },
    );
  }
}
