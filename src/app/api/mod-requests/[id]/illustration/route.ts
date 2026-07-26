import { getModRequestIllustration } from '@/lib/mod-requests';

type Context = {
  params: Promise<{ id: string }>;
};

export const dynamic = 'force-dynamic';

export async function GET(_request: Request, context: Context) {
  const { id } = await context.params;
  const illustration = await getModRequestIllustration(id);

  if (!illustration) {
    return new Response('Không tìm thấy ảnh minh họa.', {
      status: 404,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-store',
      },
    });
  }

  const responseBody = Uint8Array.from(illustration.data);

  return new Response(responseBody, {
    headers: {
      'Content-Type': illustration.contentType,
      'Content-Length': String(responseBody.byteLength),
      'Cache-Control': 'public, max-age=86400, immutable',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
