import { createHmac, timingSafeEqual } from 'node:crypto';
import { NextResponse } from 'next/server';
import {
  processSepayWebhook,
  type SepayWebhookPayload,
} from '@/lib/donations';
import { isSepayAutomationEnabled } from '@/config/features';
import { errorToContext, writeProductionLog } from '@/lib/production/logger';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const MAX_WEBHOOK_BYTES = 64 * 1024;
const DEFAULT_TIMESTAMP_TOLERANCE_SECONDS = 300;
const MAX_TIMESTAMP_TOLERANCE_SECONDS = 900;

type AuthenticationResult =
  | {
      ok: true;
      mode: 'HMAC_SHA256' | 'API_KEY';
    }
  | {
      ok: false;
      mode: 'HMAC_SHA256' | 'API_KEY' | 'NONE';
      reason: string;
    };

function safeSecretEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left, 'utf8');
  const rightBuffer = Buffer.from(right, 'utf8');

  if (leftBuffer.length !== rightBuffer.length) return false;
  return timingSafeEqual(leftBuffer, rightBuffer);
}

function timestampToleranceSeconds(): number {
  const configured = Number(
    process.env.SEPAY_WEBHOOK_TOLERANCE_SECONDS ??
      DEFAULT_TIMESTAMP_TOLERANCE_SECONDS,
  );

  if (!Number.isFinite(configured)) {
    return DEFAULT_TIMESTAMP_TOLERANCE_SECONDS;
  }

  return Math.min(
    MAX_TIMESTAMP_TOLERANCE_SECONDS,
    Math.max(60, Math.round(configured)),
  );
}

function verifyHmacAuthentication(
  request: Request,
  rawBody: string,
  secret: string,
): AuthenticationResult {
  const signatureHeader =
    request.headers.get('x-sepay-signature')?.trim() ?? '';
  const timestampHeader =
    request.headers.get('x-sepay-timestamp')?.trim() ?? '';
  const timestamp = Number(timestampHeader);

  if (
    !signatureHeader ||
    !timestampHeader ||
    !Number.isSafeInteger(timestamp) ||
    timestamp <= 0
  ) {
    return {
      ok: false,
      mode: 'HMAC_SHA256',
      reason: 'Thiếu chữ ký hoặc timestamp SePay.',
    };
  }

  const nowSeconds = Math.floor(Date.now() / 1_000);

  if (
    Math.abs(nowSeconds - timestamp) >
    timestampToleranceSeconds()
  ) {
    return {
      ok: false,
      mode: 'HMAC_SHA256',
      reason: 'Webhook SePay đã hết hạn.',
    };
  }

  const expectedSignature = `sha256=${createHmac(
    'sha256',
    secret,
  )
    .update(`${timestampHeader}.${rawBody}`, 'utf8')
    .digest('hex')}`;

  if (
    !safeSecretEqual(
      signatureHeader.toLowerCase(),
      expectedSignature,
    )
  ) {
    return {
      ok: false,
      mode: 'HMAC_SHA256',
      reason: 'Chữ ký webhook SePay không hợp lệ.',
    };
  }

  return {
    ok: true,
    mode: 'HMAC_SHA256',
  };
}

function verifyApiKeyAuthentication(
  request: Request,
  apiKey: string,
): AuthenticationResult {
  const authorization =
    request.headers.get('authorization')?.trim() ?? '';

  if (!safeSecretEqual(authorization, `Apikey ${apiKey}`)) {
    return {
      ok: false,
      mode: 'API_KEY',
      reason: 'API Key webhook SePay không hợp lệ.',
    };
  }

  return {
    ok: true,
    mode: 'API_KEY',
  };
}

function authenticateWebhook(
  request: Request,
  rawBody: string,
): AuthenticationResult {
  const hmacSecret =
    process.env.SEPAY_WEBHOOK_SECRET?.trim() ?? '';

  if (hmacSecret) {
    return verifyHmacAuthentication(
      request,
      rawBody,
      hmacSecret,
    );
  }

  const legacyApiKey =
    process.env.SEPAY_WEBHOOK_API_KEY?.trim() ?? '';

  if (legacyApiKey) {
    return verifyApiKeyAuthentication(
      request,
      legacyApiKey,
    );
  }

  return {
    ok: false,
    mode: 'NONE',
    reason: 'Server chưa cấu hình khóa xác thực SePay.',
  };
}

export async function POST(request: Request) {
  const contentLength = Number(
    request.headers.get('content-length') ?? 0,
  );

  if (
    Number.isFinite(contentLength) &&
    contentLength > MAX_WEBHOOK_BYTES
  ) {
    return NextResponse.json(
      { success: false, message: 'Payload quá lớn.' },
      { status: 413 },
    );
  }

  try {
    const rawBody = await request.text();

    if (
      Buffer.byteLength(rawBody, 'utf8') >
      MAX_WEBHOOK_BYTES
    ) {
      return NextResponse.json(
        { success: false, message: 'Payload quá lớn.' },
        { status: 413 },
      );
    }

    const authentication = authenticateWebhook(
      request,
      rawBody,
    );

    if (!authentication.ok) {
      await writeProductionLog(
        'warn',
        'Rejected SePay webhook authentication',
        {
          authMode: authentication.mode,
          reason: authentication.reason,
        },
      );

      return NextResponse.json(
        {
          success: false,
          message: 'Webhook không hợp lệ.',
        },
        { status: 401 },
      );
    }

    let parsed: unknown;

    try {
      parsed = JSON.parse(rawBody) as unknown;
    } catch {
      return NextResponse.json(
        {
          success: false,
          message: 'Payload SePay không phải JSON hợp lệ.',
        },
        { status: 400 },
      );
    }

    if (
      typeof parsed !== 'object' ||
      parsed === null ||
      Array.isArray(parsed)
    ) {
      return NextResponse.json(
        {
          success: false,
          message: 'Payload SePay không hợp lệ.',
        },
        { status: 400 },
      );
    }

    const payload = parsed as SepayWebhookPayload;
    const result = await processSepayWebhook(payload, {
      automationEnabled: isSepayAutomationEnabled(),
    });

    await writeProductionLog(
      'info',
      'Processed SePay webhook',
      {
        authMode: authentication.mode,
        providerTransactionId: String(payload.id ?? ''),
        status: result.status,
        duplicate: result.duplicate,
        test: result.test,
        promoted: result.promoted,
      },
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    await writeProductionLog(
      'error',
      'Failed to process SePay webhook',
      {
        ...errorToContext(error),
      },
    );

    return NextResponse.json(
      {
        success: false,
        message: 'Không thể xử lý giao dịch.',
      },
      { status: 500 },
    );
  }
}
