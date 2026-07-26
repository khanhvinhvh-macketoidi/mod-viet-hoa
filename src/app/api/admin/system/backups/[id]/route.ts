import fs from 'node:fs/promises';
import { getCurrentUser } from '@/lib/auth';
import { appendAdminAuditLog } from '@/lib/admin-audit';
import { createRequestId } from '@/lib/stability/request-id';
import { resolveRuntimeBackupPath } from '@/lib/system-operations';

type Context = {
  params: Promise<{ id: string }>;
};

export const dynamic = 'force-dynamic';

export async function GET(_request: Request, context: Context) {
  const requestId = createRequestId();
  const admin = await getCurrentUser();

  if (admin?.role !== 'ADMIN') {
    return new Response('Forbidden', { status: 403 });
  }

  const { id } = await context.params;
  let filePath: string;

  try {
    filePath = resolveRuntimeBackupPath(id);
  } catch {
    return new Response('Backup không hợp lệ.', { status: 400 });
  }

  try {
    const data = await fs.readFile(filePath);
    const responseBody = Uint8Array.from(data);

    await appendAdminAuditLog({
      actorUserId: admin.id,
      action: 'SYSTEM_BACKUP_DOWNLOADED',
      targetType: 'RUNTIME_BACKUP',
      targetId: id,
      requestId,
      metadata: { bytes: responseBody.byteLength },
    });

    return new Response(responseBody, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Length': String(responseBody.byteLength),
        'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(id)}`,
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff',
        'X-Robots-Tag': 'noindex, nofollow',
        'X-Request-Id': requestId,
      },
    });
  } catch {
    return new Response('Không tìm thấy backup.', {
      status: 404,
      headers: { 'Cache-Control': 'no-store', 'X-Request-Id': requestId },
    });
  }
}
