import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { runReleaseCheck, type ReleaseCheckMode } from '@/lib/release-center';
import {
  consumeRateLimit,
  getClientIp,
  isSameOriginRequest,
} from '@/lib/security/request-security';
import { createRequestId } from '@/lib/stability/request-id';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

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
    key: `admin-release-check:${admin.id}:${getClientIp(request)}`,
    limit: 8,
    windowMs: 10 * 60 * 1_000,
  });

  if (!rateLimit.allowed) {
    return NextResponse.json(
      {
        ok: false,
        message: `Vui lòng chờ ${rateLimit.retryAfterSeconds} giây trước khi kiểm tra lại.`,
        requestId,
      },
      {
        status: 429,
        headers: { 'Retry-After': String(rateLimit.retryAfterSeconds) },
      },
    );
  }

  const body = (await request.json().catch(() => ({}))) as {
    mode?: unknown;
    reason?: unknown;
  };
  const modeText = String(body.mode ?? '').toUpperCase();
  const mode: ReleaseCheckMode | null =
    modeText === 'QUICK' || modeText === 'RELEASE'
      ? modeText
      : null;

  if (!mode) {
    return NextResponse.json(
      { ok: false, message: 'Chế độ kiểm tra không hợp lệ.', requestId },
      { status: 400 },
    );
  }

  try {
    const report = await runReleaseCheck({
      mode,
      actorUserId: admin.id,
      reason: body.reason,
      requestId,
    });

    return NextResponse.json(
      { ok: true, report, requestId },
      {
        headers: {
          'Cache-Control': 'no-store',
          'X-Request-Id': requestId,
        },
      },
    );
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error
          ? error.message
          : 'Không thể chạy kiểm tra.',
        requestId,
      },
      {
        status: 500,
        headers: {
          'Cache-Control': 'no-store',
          'X-Request-Id': requestId,
        },
      },
    );
  }
}
