import 'server-only';

const DEFAULT_PRODUCTION_URL = 'https://modviethoa.vn';

function normalizeBaseUrl(value: string): string {
  const url = new URL(value.trim());

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error('Application URL must use http or https.');
  }

  url.pathname = '/';
  url.search = '';
  url.hash = '';

  return url.toString().replace(/\/$/, '');
}

export function getAppBaseUrl(request?: Request): string {
  const configuredUrl =
    process.env.APP_URL?.trim() ||
    process.env.NEXT_PUBLIC_SITE_URL?.trim();

  if (configuredUrl) {
    try {
      return normalizeBaseUrl(configuredUrl);
    } catch (error) {
      if (process.env.NODE_ENV === 'production') throw error;
    }
  }

  if (process.env.NODE_ENV === 'production') {
    return DEFAULT_PRODUCTION_URL;
  }

  if (request) {
    const forwardedProto = request.headers
      .get('x-forwarded-proto')
      ?.split(',')[0]
      ?.trim();
    const forwardedHost = request.headers
      .get('x-forwarded-host')
      ?.split(',')[0]
      ?.trim();
    const host = forwardedHost || request.headers.get('host')?.trim();

    if (host) {
      const protocol = forwardedProto || (host.startsWith('localhost') ? 'http' : 'https');
      return `${protocol}://${host}`;
    }

    try {
      return new URL(request.url).origin;
    } catch {
      // Fall through to the local development default.
    }
  }

  return 'http://localhost:3000';
}

export function createSafeRedirectUrl(
  destination: string,
  request?: Request,
): URL {
  const baseUrl = getAppBaseUrl(request);
  const fallback = new URL('/', baseUrl);
  const value = destination.trim();

  if (!value) return fallback;

  // Only permit internal destinations. Absolute URLs are accepted only when
  // they point to the configured application origin.
  if (/^https?:\/\//i.test(value)) {
    try {
      const candidate = new URL(value);
      if (candidate.origin === fallback.origin) return candidate;
    } catch {
      // Invalid absolute URL: use the safe application root below.
    }
    return fallback;
  }

  if (!value.startsWith('/') || value.startsWith('//')) {
    return fallback;
  }

  return new URL(value, baseUrl);
}
