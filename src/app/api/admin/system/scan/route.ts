import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import {
  consumeRateLimit,
  getClientIp,
  isSameOriginRequest,
} from '@/lib/security/request-security';
import { createRequestId } from '@/lib/stability/request-id';
import { runSystemIntegrityScan } from '@/lib/system-operations';

export const dynamic = 'force-dynamic';

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
    key: `admin-system-scan:${admin.id}:${getClientIp(request)}`,
    limit: 6,
    windowMs: 10 * 60 * 1_000,
  });

  if (!rateLimit.allowed) {
    return NextResponse.json(
      {
        ok: false,
        message: `Vui lòng chờ ${rateLimit.retryAfterSeconds} giây trước khi quét lại.`,
        requestId,
      },
      {
        status: 429,
        headers: { 'Retry-After': String(rateLimit.retryAfterSeconds) },
      },
    );
  }

  try {
    const report = await runSystemIntegrityScan({
      actorUserId: admin.id,
      requestId,
    });

    return NextResponse.json(
      { ok: true, report, requestId },
      { headers: { 'Cache-Control': 'no-store', 'X-Request-Id': requestId } },
    );
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message:
          error instanceof Error
            ? error.message
            : 'Không thể chạy kiểm tra toàn vẹn.',
        requestId,
      },
      {
        status: 500,
        headers: { 'Cache-Control': 'no-store', 'X-Request-Id': requestId },
      },
    );
  }
}
