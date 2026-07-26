import { revalidatePath } from 'next/cache';
import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { adjustCultivationByAdmin } from '@/lib/cultivation-service';
import { getUserById } from '@/lib/users';
import {
  consumeRateLimit,
  getClientIp,
  isSameOriginRequest,
} from '@/lib/security/request-security';

type AdjustmentBody = {
  userId?: string;
  points?: number;
  reason?: string;
};

const MAX_ABSOLUTE_ADJUSTMENT = 1_000_000;

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json(
      { ok: false, message: 'Yêu cầu không hợp lệ.' },
      { status: 403 },
    );
  }

  const admin = await getCurrentUser();
  if (admin?.role !== 'ADMIN') {
    return NextResponse.json(
      { ok: false, message: 'Forbidden' },
      { status: 403 },
    );
  }

  const rateLimit = consumeRateLimit({
    key: `admin-cultivation-adjust:${admin.id}:${getClientIp(request)}`,
    limit: 30,
    windowMs: 60_000,
  });

  if (!rateLimit.allowed) {
    return NextResponse.json(
      {
        ok: false,
        message: `Thao tác quá nhanh. Thử lại sau ${rateLimit.retryAfterSeconds} giây.`,
      },
      {
        status: 429,
        headers: {
          'Retry-After': String(rateLimit.retryAfterSeconds),
        },
      },
    );
  }

  let body: AdjustmentBody;

  try {
    body = (await request.json()) as AdjustmentBody;
  } catch {
    return NextResponse.json(
      { ok: false, message: 'JSON không hợp lệ.' },
      { status: 400 },
    );
  }

  const userId = body.userId?.trim();
  const points = Math.round(Number(body.points));
  const reason = body.reason?.trim() ?? '';

  if (!userId) {
    return NextResponse.json(
      { ok: false, message: 'Thiếu userId.' },
      { status: 400 },
    );
  }

  if (
    !Number.isSafeInteger(points) ||
    points === 0 ||
    Math.abs(points) > MAX_ABSOLUTE_ADJUSTMENT
  ) {
    return NextResponse.json(
      {
        ok: false,
        message: `Số XP phải là số nguyên khác 0 và không vượt quá ${MAX_ABSOLUTE_ADJUSTMENT.toLocaleString('vi-VN')}.`,
      },
      { status: 400 },
    );
  }

  if (reason.length < 5 || reason.length > 240) {
    return NextResponse.json(
      {
        ok: false,
        message: 'Lý do phải dài từ 5 đến 240 ký tự.',
      },
      { status: 400 },
    );
  }

  const targetUser = await getUserById(userId);
  if (!targetUser) {
    return NextResponse.json(
      { ok: false, message: 'Không tìm thấy tài khoản.' },
      { status: 404 },
    );
  }

  if (!targetUser.cultivation) {
    return NextResponse.json(
      {
        ok: false,
        message:
          'Tài khoản này vẫn đang dùng legacy preview. Hãy migrate XP cũ trước khi điều chỉnh thủ công.',
      },
      { status: 409 },
    );
  }

  try {
    const result = await adjustCultivationByAdmin({
      userId,
      adminUserId: admin.id,
      points,
      reason,
    });

    revalidatePath('/admin/cultivation');
    revalidatePath('/profile');
    revalidatePath('/creator');

    if (targetUser.profileSlug) {
      revalidatePath(`/authors/${targetUser.profileSlug}`);
    }

    return NextResponse.json({
      ok: true,
      ...result,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message:
          error instanceof Error
            ? error.message
            : 'Không thể điều chỉnh cultivation.',
      },
      { status: 400 },
    );
  }
}
