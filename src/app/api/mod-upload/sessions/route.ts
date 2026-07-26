import { NextResponse } from 'next/server';
import { requireCreator } from '@/lib/auth';
import {
  chunkUploadSizeBytes,
  createChunkedUploadSession,
} from '@/lib/chunked-upload';
import {
  consumeRateLimit,
  getClientIp,
  isSameOriginRequest,
} from '@/lib/security/request-security';

const CREATE_SESSION_WINDOW_MS = 10 * 60 * 1000;
const CREATE_SESSION_LIMIT = 12;

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json(
      { ok: false, message: 'Yêu cầu không hợp lệ.' },
      { status: 403 },
    );
  }

  const user = await requireCreator();

  if (!user) {
    return NextResponse.json(
      { ok: false, message: 'Bạn không có quyền đăng mod.' },
      { status: 403 },
    );
  }

  const rateLimit = consumeRateLimit({
    key: `mod-upload-session:${user.id}:${getClientIp(request)}`,
    limit: CREATE_SESSION_LIMIT,
    windowMs: CREATE_SESSION_WINDOW_MS,
  });

  if (!rateLimit.allowed) {
    return NextResponse.json(
      {
        ok: false,
        message: 'Bạn tạo phiên tải lên quá nhanh. Vui lòng thử lại sau.',
      },
      {
        status: 429,
        headers: {
          'Retry-After': String(rateLimit.retryAfterSeconds),
        },
      },
    );
  }

  try {
    const body = (await request.json()) as {
      fileName?: unknown;
      fileSize?: unknown;
    };

    const fileName = String(body.fileName ?? '');
    const fileSize = Number(body.fileSize);
    const session = await createChunkedUploadSession({
      userId: user.id,
      fileName,
      fileSize,
    });

    return NextResponse.json({
      ok: true,
      sessionId: session.id,
      chunkSize: chunkUploadSizeBytes(),
      receivedBytes: session.receivedBytes,
    });
  } catch (error) {
    console.error('Create chunked upload session failed:', error);

    return NextResponse.json(
      {
        ok: false,
        message:
          error instanceof Error
            ? error.message
            : 'Không thể tạo phiên tải lên.',
      },
      { status: 400 },
    );
  }
}
