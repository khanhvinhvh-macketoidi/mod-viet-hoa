import { getCurrentUser } from '@/lib/auth';
import { readModErrorReportImage } from '@/lib/mod-error-reports';
import { getModById } from '@/lib/mods';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Context = {
  params: Promise<{ id: string; imageId: string }>;
};

export async function GET(_request: Request, context: Context) {
  const { id, imageId } = await context.params;
  const result = await readModErrorReportImage({ reportId: id, imageId });

  if (!result) {
    return new Response('Image not found', { status: 404 });
  }

  const user = await getCurrentUser();
  const mod = await getModById(result.report.modId);
  const allowed = Boolean(
    user && (
      user.role === 'ADMIN' ||
      user.id === mod?.authorId ||
      user.id === result.report.reporterUserId
    ),
  );

  if (!allowed) {
    return new Response('Forbidden', { status: 403 });
  }

  const responseBody = Uint8Array.from(result.body);
  return new Response(responseBody, {
    headers: {
      'Content-Type': result.image.contentType,
      'Content-Length': String(responseBody.byteLength),
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
