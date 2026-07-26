import { getCurrentUser } from '@/lib/auth';
import { getReleaseCheckReportById } from '@/lib/release-center';
import { createRequestId } from '@/lib/stability/request-id';

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
  const report = await getReleaseCheckReportById(id);

  if (!report) {
    return new Response('Không tìm thấy báo cáo.', {
      status: 404,
      headers: { 'Cache-Control': 'no-store', 'X-Request-Id': requestId },
    });
  }

  const body = Buffer.from(`${JSON.stringify(report, null, 2)}\n`, 'utf8');
  const fileName = `release-check-${report.mode.toLowerCase()}-${report.createdAt
    .replace(/[:.]/g, '-')
    .replace(/\+/g, '_')}.json`;

  return new Response(Uint8Array.from(body), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Length': String(body.byteLength),
      'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`,
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
      'X-Robots-Tag': 'noindex, nofollow',
      'X-Request-Id': requestId,
    },
  });
}
