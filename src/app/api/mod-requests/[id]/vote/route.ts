import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { toggleModRequestVote } from '@/lib/mod-requests';
import {
  consumeRateLimit,
  getClientIp,
  isSameOriginRequest,
} from '@/lib/security/request-security';

type Context = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, context: Context) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json(
      { ok: false, message: 'Nguồn yêu cầu không hợp lệ.' },
      { status: 403 },
    );
  }

  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json(
      { ok: false, message: 'Đạo hữu cần đăng nhập để bình chọn.' },
      { status: 401 },
    );
  }

  const rateLimit = consumeRateLimit({
    key: `mod-request:vote:${user.id}:${getClientIp(request)}`,
    limit: 30,
    windowMs: 60_000,
  });

  if (!rateLimit.allowed) {
    return NextResponse.json(
      { ok: false, message: 'Đạo hữu thao tác quá nhanh.' },
      {
        status: 429,
        headers: {
          'Retry-After': String(rateLimit.retryAfterSeconds),
        },
      },
    );
  }

  try {
    const { id } = await context.params;
    const result = await toggleModRequestVote({
      requestId: id,
      userId: user.id,
    });

    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message:
          error instanceof Error
            ? error.message
            : 'Không thể bình chọn.',
      },
      { status: 400 },
    );
  }
}
