export const SITE_NAME = 'MOD Việt Hóa';
const rawSiteUrl =
  process.env.APP_URL?.trim() ||
  process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
  'https://modviethoa.vn';

export const SITE_URL = rawSiteUrl.replace(/\/$/, '');
export const DEFAULT_DESCRIPTION =
  'Thư viện mod, bản Việt hóa và công cụ hỗ trợ game dành cho cộng đồng game thủ Việt Nam.';

export function absoluteUrl(pathOrUrl?: string | null): string {
  if (!pathOrUrl) return `${SITE_URL}/opengraph-image`;

  try {
    return new URL(pathOrUrl).toString();
  } catch {
    const path = pathOrUrl.startsWith('/') ? pathOrUrl : `/${pathOrUrl}`;
    return `${SITE_URL}${path}`;
  }
}

export function compactDescription(value?: string | null, maxLength = 160): string {
  const normalized = (value || DEFAULT_DESCRIPTION)
    .replace(/\s+/g, ' ')
    .trim();

  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`;
}

export function safeJsonLd(value: unknown): string {
  return JSON.stringify(value).replace(/</g, '\\u003c');
}
