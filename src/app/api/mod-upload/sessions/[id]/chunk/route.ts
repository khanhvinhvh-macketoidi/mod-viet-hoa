import { NextResponse } from 'next/server';
import { requireCreator } from '@/lib/auth';
import { appendChunk, chunkUploadSizeBytes } from '@/lib/chunked-upload';
import { isSameOriginRequest } from '@/lib/security/request-security';

export async function PUT(
  request: Request,
  {
    params,
  }: {
    params: Promise<{ id: string }>;
  },
) {
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

  const contentLength = Number(
    request.headers.get('content-length') ?? 0,
  );

  if (
    Number.isFinite(contentLength) &&
    contentLength > chunkUploadSizeBytes()
  ) {
    return NextResponse.json(
      { ok: false, message: 'Chunk tải lên vượt giới hạn.' },
      { status: 413 },
    );
  }

  try {
    const { id } = await params;
    const rawOffset = request.headers.get('x-upload-offset');

    if (rawOffset === null) {
      throw new Error('Thiếu offset của chunk tải lên.');
    }

    const offset = Number(rawOffset);
    const chunk = new Uint8Array(await request.arrayBuffer());
    const manifest = await appendChunk({
      sessionId: id,
      userId: user.id,
      offset,
      chunk,
    });

    return NextResponse.json({
      ok: true,
      receivedBytes: manifest.receivedBytes,
      totalBytes: manifest.totalBytes,
    });
  } catch (error) {
    console.error('Append upload chunk failed:', error);

    return NextResponse.json(
      {
        ok: false,
        message:
          error instanceof Error
            ? error.message
            : 'Không thể ghi chunk tải lên.',
      },
      { status: 409 },
    );
  }
}
