import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import {
  createModRequest,
  getPublicModRequests,
} from '@/lib/mod-requests';
import { getUserDisplayName } from '@/lib/users';
import {
  MAX_IMAGE_FILE_BYTES,
  validateImageFile,
} from '@/lib/security/upload-security';
import {
  consumeRateLimit,
  getClientIp,
  isSameOriginRequest,
} from '@/lib/security/request-security';

export const dynamic = 'force-dynamic';

const MAX_JSON_REQUEST_BYTES = 32 * 1024;
const MAX_MULTIPART_REQUEST_BYTES =
  MAX_IMAGE_FILE_BYTES + 128 * 1024;

export async function GET() {
  const user = await getCurrentUser();
  const requests = await getPublicModRequests(user?.id);

  return NextResponse.json(
    { ok: true, requests },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json(
      { ok: false, message: 'Nguồn yêu cầu không hợp lệ.' },
      { status: 403 },
    );
  }

  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json(
      { ok: false, message: 'Đạo hữu cần đăng nhập.' },
      { status: 401 },
    );
  }

  const rateLimit = consumeRateLimit({
    key: `mod-request:create:${user.id}:${getClientIp(request)}`,
    limit: 5,
    windowMs: 60 * 60 * 1000,
  });

  if (!rateLimit.allowed) {
    return NextResponse.json(
      {
        ok: false,
        message: 'Đạo hữu gửi yêu cầu quá nhanh. Vui lòng thử lại sau.',
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
    const contentType = request.headers.get('content-type') ?? '';
    const contentLength = Number(
      request.headers.get('content-length') ?? 0,
    );

    let body: Record<string, unknown>;
    let illustrationFile: File | null = null;

    if (contentType.toLowerCase().startsWith('multipart/form-data')) {
      if (contentLength > MAX_MULTIPART_REQUEST_BYTES) {
        return NextResponse.json(
          { ok: false, message: 'Ảnh minh họa không được vượt quá 2 MB.' },
          { status: 413 },
        );
      }

      const formData = await request.formData();
      const illustrationEntries = formData
        .getAll('illustration')
        .filter(
          (entry): entry is File =>
            entry instanceof File && entry.size > 0,
        );

      if (illustrationEntries.length > 1) {
        throw new Error('Chỉ được đính kèm duy nhất một ảnh minh họa.');
      }

      illustrationFile = illustrationEntries[0] ?? null;

      if (illustrationFile) {
        await validateImageFile(illustrationFile, 'Ảnh minh họa');
      }

      body = {
        title: formData.get('title'),
        game: formData.get('game'),
        description: formData.get('description'),
        sourceUrl: formData.get('sourceUrl'),
      };
    } else {
      if (contentLength > MAX_JSON_REQUEST_BYTES) {
        return NextResponse.json(
          { ok: false, message: 'Nội dung yêu cầu quá lớn.' },
          { status: 413 },
        );
      }

      const rawBody = await request.text();

      if (Buffer.byteLength(rawBody, 'utf8') > MAX_JSON_REQUEST_BYTES) {
        return NextResponse.json(
          { ok: false, message: 'Nội dung yêu cầu quá lớn.' },
          { status: 413 },
        );
      }

      body = JSON.parse(rawBody) as Record<string, unknown>;
    }

    const created = await createModRequest({
      userId: user.id,
      userName: getUserDisplayName(user),
      title: body.title,
      game: body.game,
      description: body.description,
      sourceUrl: body.sourceUrl,
      illustrationFile,
    });

    return NextResponse.json(
      {
        ok: true,
        message: 'Đã gửi yêu cầu mod.',
        request: {
          ...created,
          illustrationUrl: created.illustration
            ? `/api/mod-requests/${encodeURIComponent(created.id)}/illustration`
            : undefined,
          voteCount: 0,
          viewerHasVoted: false,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message:
          error instanceof Error
            ? error.message
            : 'Không thể tạo yêu cầu mod.',
      },
      { status: 400 },
    );
  }
}
