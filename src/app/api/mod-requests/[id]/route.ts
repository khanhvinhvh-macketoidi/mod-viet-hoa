import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import {
  cancelModRequest,
  updateModRequestStatus,
  type ModRequestStatus,
} from '@/lib/mod-requests';
import { isSameOriginRequest } from '@/lib/security/request-security';

type Context = {
  params: Promise<{ id: string }>;
};

export async function DELETE(request: Request, context: Context) {
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

  try {
    const { id } = await context.params;
    const updated = await cancelModRequest({
      requestId: id,
      userId: user.id,
      isAdmin: user.role === 'ADMIN',
    });

    return NextResponse.json({
      ok: true,
      message: 'Đã hủy yêu cầu mod.',
      request: updated,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message:
          error instanceof Error
            ? error.message
            : 'Không thể hủy yêu cầu.',
      },
      { status: 400 },
    );
  }
}

export async function PATCH(request: Request, context: Context) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json(
      { ok: false, message: 'Nguồn yêu cầu không hợp lệ.' },
      { status: 403 },
    );
  }

  const user = await getCurrentUser();

  if (!user || user.role !== 'ADMIN') {
    return NextResponse.json(
      { ok: false, message: 'Chỉ quản trị viên được đổi trạng thái.' },
      { status: 403 },
    );
  }

  try {
    const { id } = await context.params;
    const body = (await request.json()) as {
      status?: ModRequestStatus;
    };

    if (!body.status) {
      throw new Error('Thiếu trạng thái yêu cầu.');
    }

    const updated = await updateModRequestStatus({
      requestId: id,
      status: body.status,
    });

    return NextResponse.json({
      ok: true,
      message: 'Đã cập nhật trạng thái.',
      request: updated,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message:
          error instanceof Error
            ? error.message
            : 'Không thể cập nhật trạng thái.',
      },
      { status: 400 },
    );
  }
}
