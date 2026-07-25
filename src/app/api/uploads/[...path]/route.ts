import fs from 'node:fs/promises';

import {
  mediaContentType,
  resolveRequestedMediaPath,
} from '@/lib/media-storage';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type UploadRouteContext = {
  params: Promise<{
    path: string[];
  }>;
};

async function readUpload(context: UploadRouteContext): Promise<{
  body: ArrayBuffer;
  contentType: string;
} | null> {
  const { path: segments } = await context.params;
  const resolved = resolveRequestedMediaPath(segments);

  if (!resolved) {
    return null;
  }

  try {
    const file = await fs.readFile(resolved.filePath);

    return {
      body: Uint8Array.from(file).buffer,
      contentType: mediaContentType(resolved.storedName),
    };
  } catch {
    return null;
  }
}

export async function GET(
  _request: Request,
  context: UploadRouteContext,
) {
  const upload = await readUpload(context);

  if (!upload) {
    return new Response('Image not found', {
      status: 404,
      headers: {
        'Cache-Control': 'no-store',
      },
    });
  }

  return new Response(upload.body, {
    headers: {
      'Content-Type': upload.contentType,
      'Content-Length': String(upload.body.byteLength),
      'Cache-Control': 'public, max-age=31536000, immutable',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}

export async function HEAD(
  request: Request,
  context: UploadRouteContext,
) {
  const response = await GET(request, context);

  return new Response(null, {
    status: response.status,
    headers: response.headers,
  });
}
