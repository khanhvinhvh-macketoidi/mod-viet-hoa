export const PUBLIC_SITE_NAME = 'MOD Việt Hóa';
export const PUBLIC_SITE_URL =
  process.env.APP_URL?.trim() ||
  process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
  'https://modviethoa.vn';

export const SUPPORT_EMAIL =
  process.env.NEXT_PUBLIC_SUPPORT_EMAIL?.trim() ||
  'support@modviethoa.vn';

export const LEGAL_EFFECTIVE_DATE = '20/07/2026';
export const PUBLIC_BETA_LABEL = 'Public Beta';

export function supportMailto(subject: string): string {
  const query = new URLSearchParams({
    subject,
  });

  return `mailto:${SUPPORT_EMAIL}?${query.toString()}`;
}
