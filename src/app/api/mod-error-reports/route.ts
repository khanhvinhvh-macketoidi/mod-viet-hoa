import { NextResponse } from 'next/server';

import { getCurrentUser } from '@/lib/auth';
import {
  createModErrorReport,
  getVisibleModErrorReports,
} from '@/lib/mod-error-reports';
import { getModById } from '@/lib/mods';
import { createNotification } from '@/lib/notifications';
import { getUsers } from '@/lib/store';
import {
  MAX_IMAGE_FILE_BYTES,
  validateImageFile,
} from '@/lib/security/upload-security';
import {
  consumeRateLimit,
  getClientIp,
  isSameOriginRequest,
} from '@/lib/security/request-security';
import { getUserDisplayName } from '@/lib/users';

export const dynamic = 'force-dynamic';

const MAX_MULTIPART_BYTES = 3 * MAX_IMAGE_FILE_BYTES + 256 * 1024;

export async function GET(request: Request) {
  const user = await getCurrentUser();
  const url = new URL(request.url);
  const modId = url.searchParams.get('modId')?.trim() ?? '';

  if (!modId) {
    return NextResponse.json(
      { ok: false, message: 'Thiếu mã mod.' },
      { status: 400 },
    );
  }

  const mod = await getModById(modId);
  if (!mod) {
    return NextResponse.json(
      { ok: false, message: 'Không tìm thấy mod.' },
      { status: 404 },
    );
  }

  const canManage = Boolean(
    user && (user.role === 'ADMIN' || user.id === mod.authorId),
  );
  const reports = await getVisibleModErrorReports({
    modId,
    viewerUserId: user?.id,
    canManage,
  });

  return NextResponse.json(
    { ok: true, reports, canManage },
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
      { ok: false, message: 'Đạo hữu cần đăng nhập để báo lỗi.' },
      { status: 401 },
    );
  }

  const contentLength = Number(request.headers.get('content-length') ?? 0);
  if (contentLength > MAX_MULTIPART_BYTES) {
    return NextResponse.json(
      { ok: false, message: 'Tổng dung lượng ảnh báo lỗi quá lớn.' },
      { status: 413 },
    );
  }

  const rateLimit = consumeRateLimit({
    key: `mod-error-report:create:${user.id}:${getClientIp(request)}`,
    limit: 8,
    windowMs: 60 * 60 * 1000,
  });

  if (!rateLimit.allowed) {
    return NextResponse.json(
      { ok: false, message: 'Đạo hữu gửi báo cáo quá nhanh. Vui lòng thử lại sau.' },
      {
        status: 429,
        headers: { 'Retry-After': String(rateLimit.retryAfterSeconds) },
      },
    );
  }

  try {
    const formData = await request.formData();
    const modId = String(formData.get('modId') ?? '').trim();
    const mod = await getModById(modId);

    if (!mod) throw new Error('Không tìm thấy mod cần báo lỗi.');

    const images = formData
      .getAll('images')
      .filter(
        (entry): entry is File => entry instanceof File && entry.size > 0,
      );

    if (images.length < 1 || images.length > 3) {
      throw new Error('Vui lòng đính kèm từ 1 đến 3 ảnh lỗi.');
    }

    for (const [index, image] of images.entries()) {
      await validateImageFile(image, `Ảnh lỗi ${index + 1}`);
    }

    const reporterName = getUserDisplayName(user);
    const created = await createModErrorReport({
      modId: mod.id,
      modSlug: mod.slug,
      modTitle: mod.title,
      reporterUserId: user.id,
      reporterName,
      version: formData.get('version'),
      category: formData.get('category'),
      title: formData.get('title'),
      description: formData.get('description'),
      reproductionSteps: formData.get('reproductionSteps'),
      environment: formData.get('environment'),
      imageFiles: images,
    });

    try {
      const users = await getUsers();
      const recipientIds = new Set(
        users
          .filter((item) => item.role === 'ADMIN' && item.isActive !== false)
          .map((item) => item.id),
      );

      if (mod.authorId) recipientIds.add(mod.authorId);
      recipientIds.delete(user.id);

      for (const recipientId of recipientIds) {
        await createNotification({
          userId: recipientId,
          type: 'SYSTEM',
          title: 'Có báo cáo lỗi mod mới',
          message: `${reporterName} báo lỗi “${created.title}” trong ${mod.title}.`,
          href: `/mods/${mod.slug}#mod-error-reports`,
          actorUserId: user.id,
          relatedModId: mod.id,
          dedupeKey: `mod-error-report:${created.id}:${recipientId}`,
        });
      }
    } catch (notificationError) {
      console.error(
        `[mod-error-report:${created.id}] Không thể tạo thông báo:`,
        notificationError,
      );
    }

    return NextResponse.json(
      { ok: true, report: created, message: 'Đã gửi báo cáo lỗi mod.' },
      { status: 201 },
    );
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error
          ? error.message
          : 'Không thể gửi báo cáo lỗi.',
      },
      { status: 400 },
    );
  }
}
