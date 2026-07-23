import 'server-only';


import { createSafeRedirectUrl } from '@/lib/production/url';
export { createSafeRedirectUrl } from '@/lib/production/url';

type Bucket = {
  count: number;
  resetAt: number;
};

type RateLimitOptions = {
  key: string;
  limit: number;
  windowMs: number;
};

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
};

const globalRateLimitStore = globalThis as typeof globalThis & {
  __modLibraryRateLimits?: Map<string, Bucket>;
};

const buckets =
  globalRateLimitStore.__modLibraryRateLimits ??
  new Map<string, Bucket>();

globalRateLimitStore.__modLibraryRateLimits = buckets;

function pruneExpiredBuckets(now: number) {
  if (buckets.size < 1_000) return;

  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

export function getClientIp(request: Request): string {
  const cloudflareIp = request.headers.get('cf-connecting-ip')?.trim();
  if (cloudflareIp) return cloudflareIp.slice(0, 80);

  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    const firstIp = forwarded.split(',')[0]?.trim();
    if (firstIp) return firstIp.slice(0, 80);
  }

  const realIp = request.headers.get('x-real-ip')?.trim();
  return realIp?.slice(0, 80) || 'unknown';
}

export function consumeRateLimit({
  key,
  limit,
  windowMs,
}: RateLimitOptions): RateLimitResult {
  const now = Date.now();
  pruneExpiredBuckets(now);

  const current = buckets.get(key);

  if (!current || current.resetAt <= now) {
    buckets.set(key, {
      count: 1,
      resetAt: now + windowMs,
    });

    return {
      allowed: true,
      remaining: Math.max(0, limit - 1),
      retryAfterSeconds: 0,
    };
  }

  if (current.count >= limit) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.max(
        1,
        Math.ceil((current.resetAt - now) / 1000),
      ),
    };
  }

  current.count += 1;

  return {
    allowed: true,
    remaining: Math.max(0, limit - current.count),
    retryAfterSeconds: 0,
  };
}

export function isSameOriginRequest(request: Request): boolean {
  const secFetchSite = request.headers.get('sec-fetch-site');

  if (secFetchSite === 'cross-site') {
    return false;
  }

  const origin = request.headers.get('origin');

  // Một số client nội bộ hoặc kiểm thử không gửi Origin.
  if (!origin) {
    return true;
  }

  try {
    const originUrl = new URL(origin);
    const forwardedHost =
      request.headers.get('x-forwarded-host')?.split(',')[0]?.trim();
    const host = forwardedHost || request.headers.get('host');

    if (!host) return false;

    return originUrl.host.toLowerCase() === host.toLowerCase();
  } catch {
    return false;
  }
}

export function redirectWithRetry(
  request: Request,
  pathname: string,
  retryAfterSeconds: number,
): Response {
  const response = Response.redirect(createSafeRedirectUrl(pathname, request), 303);
  response.headers.set('Retry-After', String(retryAfterSeconds));
  response.headers.set('Cache-Control', 'no-store');
  return response;
}
