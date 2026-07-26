import { NextResponse } from 'next/server';
import { requireCreator } from '@/lib/auth';
import { removeChunkedUploadSession } from '@/lib/chunked-upload';
import { isSameOriginRequest } from '@/lib/security/request-security';

export async function DELETE(
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
    await removeChunkedUploadSession({
      sessionId: id,
      userId: user.id,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Cancel chunked upload failed:', error);

    return NextResponse.json(
      {
        ok: false,
        message:
          error instanceof Error
            ? error.message
            : 'Không thể hủy phiên tải lên.',
      },
      { status: 400 },
    );
  }
}
