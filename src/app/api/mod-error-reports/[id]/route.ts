import { NextResponse } from 'next/server';

import { getCurrentUser } from '@/lib/auth';
import {
  getModErrorReportById,
  updateModErrorReport,
} from '@/lib/mod-error-reports';
import type { ModErrorReportStatus } from '@/lib/mod-error-report-types';
import { getModById } from '@/lib/mods';
import { createNotification } from '@/lib/notifications';
import { isSameOriginRequest } from '@/lib/security/request-security';

export const dynamic = 'force-dynamic';

const STATUS_LABELS: Record<ModErrorReportStatus, string> = {
  NEW: 'Mới',
  VERIFYING: 'Đang xác minh',
  NEED_INFO: 'Cần thêm thông tin',
  FIXED: 'Đã sửa',
  REJECTED: 'Từ chối',
};

type Context = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, context: Context) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json(
      { ok: false, message: 'Nguồn yêu cầu không hợp lệ.' },
      { status: 403 },
    );
  }

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { ok: false, message: 'Phiên đăng nhập đã hết hạn.' },
      { status: 401 },
    );
  }

  const { id } = await context.params;
  const report = await getModErrorReportById(id);
  if (!report) {
    return NextResponse.json(
      { ok: false, message: 'Không tìm thấy báo cáo lỗi.' },
      { status: 404 },
    );
  }

  const mod = await getModById(report.modId);
  const canManage = user.role === 'ADMIN' || user.id === mod?.authorId;
  if (!canManage) {
    return NextResponse.json(
      { ok: false, message: 'Đạo hữu không có quyền xử lý báo cáo này.' },
      { status: 403 },
    );
  }

  try {
    const body = (await request.json()) as {
      status?: ModErrorReportStatus;
      resolutionNote?: string;
    };

    const updated = await updateModErrorReport({
      reportId: id,
      status: body.status ?? 'NEW',
      resolutionNote: body.resolutionNote,
      handledByUserId: user.id,
    });

    if (updated.reporterUserId !== user.id) {
      try {
        await createNotification({
          userId: updated.reporterUserId,
          type: 'SYSTEM',
          title: 'Báo cáo lỗi mod đã được cập nhật',
          message: `“${updated.title}” chuyển sang trạng thái ${STATUS_LABELS[updated.status]}.`,
          href: `/mods/${updated.modSlug}#mod-error-reports`,
          actorUserId: user.id,
          relatedModId: updated.modId,
          dedupeKey: `mod-error-report-status:${updated.id}:${updated.status}:${updated.updatedAt}`,
        });
      } catch (notificationError) {
        console.error(
          `[mod-error-report:${updated.id}] Không thể thông báo trạng thái:`,
          notificationError,
        );
      }
    }

    return NextResponse.json({ ok: true, report: updated });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error
          ? error.message
          : 'Không thể cập nhật báo cáo.',
      },
      { status: 400 },
    );
  }
}
