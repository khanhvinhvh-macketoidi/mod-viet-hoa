import { NextRequest, NextResponse } from 'next/server';

type Bucket = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, Bucket>();

const WINDOW_MS = 60_000;
const API_LIMIT = Number(
  process.env.RATE_LIMIT_API_PER_MINUTE ?? 120,
);
const AUTH_LIMIT = Number(
  process.env.RATE_LIMIT_AUTH_PER_MINUTE ?? 15,
);
const WRITE_LIMIT = Number(
  process.env.RATE_LIMIT_WRITE_PER_MINUTE ?? 40,
);
const UPLOAD_MAX_BYTES = Number(
  process.env.UPLOAD_MAX_BYTES ?? 104_857_600,
);
const CANONICAL_HOST = 'modviethoa.vn';

/**
 * Những đường dẫn này phải được Next.js phục vụ trực tiếp.
 * Proxy không được redirect, rate-limit hoặc rewrite chúng.
 */
function isPublicAsset(pathname: string): boolean {
  if (
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/images/') ||
    pathname.startsWith('/icons/') ||
    pathname.startsWith('/uploads/')
  ) {
    return true;
  }

  if (
    pathname === '/favicon.ico' ||
    pathname === '/robots.txt' ||
    pathname === '/sitemap.xml' ||
    pathname === '/manifest.webmanifest'
  ) {
    return true;
  }

  // Bỏ qua mọi file tĩnh có phần mở rộng:
  // .png, .jpg, .webp, .svg, .txt, .xml, .json, .woff2...
  return /\.[a-zA-Z0-9]+$/.test(pathname);
}

function clientIp(request: NextRequest): string {
  return (
    request.headers.get('cf-connecting-ip') ||
    request.headers
      .get('x-forwarded-for')
      ?.split(',')[0]
      ?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  );
}

function limitFor(pathname: string, method: string): number {
  if (/\/(login|register|auth)(\/|$)/i.test(pathname)) {
    return AUTH_LIMIT;
  }

  if (
    method !== 'GET' &&
    method !== 'HEAD' &&
    method !== 'OPTIONS'
  ) {
    return WRITE_LIMIT;
  }

  return API_LIMIT;
}

function take(
  key: string,
  limit: number,
): {
  allowed: boolean;
  remaining: number;
  resetAt: number;
} {
  const now = Date.now();
  const current = buckets.get(key);

  if (!current || current.resetAt <= now) {
    const next: Bucket = {
      count: 1,
      resetAt: now + WINDOW_MS,
    };

    buckets.set(key, next);

    return {
      allowed: true,
      remaining: Math.max(0, limit - 1),
      resetAt: next.resetAt,
    };
  }

  current.count += 1;
  buckets.set(key, current);

  return {
    allowed: current.count <= limit,
    remaining: Math.max(0, limit - current.count),
    resetAt: current.resetAt,
  };
}

function setSecurityHeaders(response: NextResponse): void {
  response.headers.set(
    'X-Content-Type-Options',
    'nosniff',
  );
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set(
    'Referrer-Policy',
    'strict-origin-when-cross-origin',
  );
  response.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=()',
  );
  response.headers.set(
    'Cross-Origin-Opener-Policy',
    'same-origin',
  );
  response.headers.set(
    'Cross-Origin-Resource-Policy',
    'same-origin',
  );

  if (process.env.NODE_ENV === 'production') {
    response.headers.set(
      'Strict-Transport-Security',
      'max-age=31536000; includeSubDomains',
    );
  }
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  /*
   * Lớp bảo vệ thứ hai.
   * Matcher phía dưới đã loại asset tĩnh, nhưng điều kiện này
   * giúp file vẫn an toàn nếu matcher bị thay đổi về sau.
   */
  if (isPublicAsset(pathname)) {
    return NextResponse.next();
  }

  const forwardedHost =
    request.headers.get('x-forwarded-host') ||
    request.headers.get('host') ||
    '';

  const hostname = forwardedHost
    .split(':')[0]
    .toLowerCase();

  if (hostname === `www.${CANONICAL_HOST}`) {
    const target = request.nextUrl.clone();
    target.protocol = 'https:';
    target.host = CANONICAL_HOST;

    return NextResponse.redirect(target, 308);
  }

  if (pathname.startsWith('/api/')) {
    const contentLength = Number(
      request.headers.get('content-length') ?? 0,
    );

    if (contentLength > UPLOAD_MAX_BYTES) {
      return NextResponse.json(
        {
          error: 'PAYLOAD_TOO_LARGE',
          message:
            'Tệp hoặc yêu cầu vượt quá giới hạn cho phép.',
        },
        {
          status: 413,
        },
      );
    }

    if (pathname !== '/api/health') {
      const limit = limitFor(
        pathname,
        request.method,
      );

      const key = [
        clientIp(request),
        request.method,
        pathname,
      ].join(':');

      const result = take(key, limit);

      if (!result.allowed) {
        const retryAfter = Math.max(
          1,
          Math.ceil(
            (result.resetAt - Date.now()) / 1000,
          ),
        );

        return NextResponse.json(
          {
            error: 'RATE_LIMITED',
            message:
              'Đạo hữu thao tác quá nhanh. Vui lòng thử lại sau.',
          },
          {
            status: 429,
            headers: {
              'Retry-After': String(retryAfter),
              'X-RateLimit-Limit': String(limit),
              'X-RateLimit-Remaining': '0',
            },
          },
        );
      }
    }
  }

  const response = NextResponse.next();
  setSecurityHeaders(response);

  return response;
}

/**
 * Chỉ chạy proxy đối với route ứng dụng và API.
 *
 * Loại trừ:
 * - tài nguyên nội bộ của Next.js;
 * - các thư mục public phổ biến;
 * - mọi URL kết thúc bằng phần mở rộng file.
 *
 * Ví dụ được bỏ qua:
 * /asset-test.txt
 * /images/avatar-ranks/v32final/nhan-kiet-frame.png
 * /uploads/avatar.webp
 */
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|images(?:/|$)|icons(?:/|$)|uploads(?:/|$)|favicon.ico|robots.txt|sitemap.xml|manifest.webmanifest|.*\\.[a-zA-Z0-9]+$).*)',
  ],
};
