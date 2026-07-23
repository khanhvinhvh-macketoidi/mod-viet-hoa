import fs from 'node:fs/promises';
import path from 'node:path';
import { NextResponse } from 'next/server';
import { createRequestId } from '@/lib/stability/request-id';

export const dynamic = 'force-dynamic';

async function directoryStatus(directory: string) {
  try {
    const stat = await fs.stat(directory);

    return {
      exists: stat.isDirectory(),
      writable: await fs
        .access(directory, fs.constants.W_OK)
        .then(() => true)
        .catch(() => false),
    };
  } catch {
    return {
      exists: false,
      writable: false,
    };
  }
}

export async function GET() {
  const requestId = createRequestId();
  const startedAt = Date.now();

  const dataDirectory = path.join(process.cwd(), 'data');
  const uploadDirectory = path.join(process.cwd(), 'storage', 'uploads');

  const [data, uploads] = await Promise.all([
    directoryStatus(dataDirectory),
    directoryStatus(uploadDirectory),
  ]);

  const healthy =
    data.exists &&
    data.writable &&
    uploads.exists &&
    uploads.writable;

  const body = {
    status: healthy ? 'ok' : 'degraded',
    requestId,
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    responseTimeMs: Date.now() - startedAt,
    storage: {
      data,
      uploads,
    },
  };

  return NextResponse.json(body, {
    status: healthy ? 200 : 503,
    headers: {
      'Cache-Control': 'no-store',
      'X-Request-Id': requestId,
      'X-Robots-Tag': 'noindex, nofollow',
    },
  });
}
