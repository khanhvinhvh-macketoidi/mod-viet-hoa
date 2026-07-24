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
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.APP_URL ||
    process.env.SITE_URL;

  if (configuredUrl) {
    try {
      return normalizeBaseUrl(configuredUrl);
    } catch {
      if (process.env.NODE_ENV === 'production') {
        throw new Error(
          `Invalid production application URL: ${configuredUrl}`
        );
      }
    }
  }

  if (process.env.NODE_ENV === 'production') {
    if (request) {
      const forwardedHost =
        request.headers.get('x-forwarded-host')?.split(',')[0]?.trim();

      const host =
        forwardedHost ||
        request.headers.get('host')?.trim();

      if (host && !host.startsWith('localhost')) {
        const forwardedProto =
          request.headers.get('x-forwarded-proto')?.split(',')[0]?.trim();

        const protocol =
          forwardedProto ||
          (host.startsWith('127.0.0.1') ? 'http' : 'https');

        return `${protocol}://${host}`;
      }
    }

    return DEFAULT_PRODUCTION_URL;
  }

  return 'http://localhost:3000';
}

export function createSafeRedirectUrl(
  destination: string,
  request?: Request
): URL {
  const baseUrl = getAppBaseUrl(request);
  const fallback = new URL('/', baseUrl);
  const value = destination.trim();

  if (!value) {
    return fallback;
  }

  // Relative URL: /admin/mods?updated=1
  if (!/^https?:\/\//i.test(value)) {
    return new URL(
      value.startsWith('/') ? value : `/${value}`,
      baseUrl
    );
  }

  // Absolute URL: only allow the same application origin
  try {
    const candidate = new URL(value);

    if (candidate.origin === fallback.origin) {
      return candidate;
    }
  } catch {
    // Ignore invalid absolute URLs
  }

  return fallback;
}