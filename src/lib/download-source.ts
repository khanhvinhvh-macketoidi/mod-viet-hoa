export type ModDownloadSource = 'LOCAL' | 'EXTERNAL';

const MAX_EXTERNAL_URL_LENGTH = 2_048;

function isPrivateIpv4(hostname: string): boolean {
  const parts = hostname.split('.').map((part) => Number(part));

  if (
    parts.length !== 4 ||
    parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)
  ) {
    return false;
  }

  const [a, b] = parts;

  return (
    a === 10 ||
    a === 127 ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168)
  );
}

export function normalizeExternalDownloadUrl(value: unknown): string {
  const raw = typeof value === 'string' ? value.trim() : '';

  if (!raw) {
    throw new Error('Vui lòng nhập link tải ngoài.');
  }

  if (raw.length > MAX_EXTERNAL_URL_LENGTH) {
    throw new Error('Link tải ngoài quá dài.');
  }

  let url: URL;

  try {
    url = new URL(raw);
  } catch {
    throw new Error('Link tải ngoài không hợp lệ.');
  }

  if (url.protocol !== 'https:') {
    throw new Error('Link tải ngoài phải dùng HTTPS.');
  }

  if (url.username || url.password) {
    throw new Error('Link tải ngoài không được chứa thông tin đăng nhập.');
  }

  const hostname = url.hostname.toLowerCase().replace(/\.$/, '');

  if (
    !hostname ||
    hostname === 'localhost' ||
    hostname.endsWith('.localhost') ||
    hostname.endsWith('.local') ||
    hostname === '::1' ||
    isPrivateIpv4(hostname)
  ) {
    throw new Error('Tên miền của link tải ngoài không được phép.');
  }

  return url.toString();
}

export function getDownloadSource(item: {
  downloadSource?: ModDownloadSource;
  externalDownloadUrl?: string;
}): ModDownloadSource {
  return item.downloadSource === 'EXTERNAL' || item.externalDownloadUrl
    ? 'EXTERNAL'
    : 'LOCAL';
}
