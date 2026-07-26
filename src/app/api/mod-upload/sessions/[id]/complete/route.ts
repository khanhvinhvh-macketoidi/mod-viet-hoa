import { NextResponse } from 'next/server';
import { requireCreator } from '@/lib/auth';
import { completeChunkedUploadSession } from '@/lib/chunked-upload';
import { isSameOriginRequest } from '@/lib/security/request-security';

export async function POST(
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

  try {
    const { id } = await params;
    const manifest = await completeChunkedUploadSession({
      sessionId: id,
      userId: user.id,
    });

    return NextResponse.json({
      ok: true,
      sessionId: manifest.id,
      fileName: manifest.originalFileName,
      fileSize: manifest.totalBytes,
    });
  } catch (error) {
    console.error('Complete chunked upload failed:', error);

    return NextResponse.json(
      {
        ok: false,
        message:
          error instanceof Error
            ? error.message
            : 'Không thể hoàn tất file tải lên.',
      },
      { status: 400 },
    );
  }
}
