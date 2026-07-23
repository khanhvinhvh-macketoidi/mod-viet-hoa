import path from 'node:path';

const IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
const PACKAGE_EXTENSIONS = new Set(['.zip', '.rar', '.7z']);

export class UploadValidationError extends Error {
  constructor(message: string, public readonly code: string) {
    super(message);
    this.name = 'UploadValidationError';
  }
}

function safeFileName(name: string): string {
  return path.basename(name).replace(/[^a-zA-Z0-9._()\-\s]/g, '_').slice(0, 180);
}

export function validateImageUpload(file: File): { safeName: string } {
  const maxBytes = Number(process.env.IMAGE_MAX_BYTES ?? 10_485_760);
  if (!IMAGE_TYPES.has(file.type)) {
    throw new UploadValidationError('Chỉ chấp nhận JPG, PNG, WEBP hoặc GIF.', 'INVALID_IMAGE_TYPE');
  }
  if (file.size <= 0 || file.size > maxBytes) {
    throw new UploadValidationError('Dung lượng ảnh không hợp lệ.', 'INVALID_IMAGE_SIZE');
  }
  return { safeName: safeFileName(file.name) };
}

export function validateModPackageUpload(file: File): { safeName: string } {
  const maxBytes = Number(process.env.MOD_PACKAGE_MAX_BYTES ?? 524_288_000);
  const extension = path.extname(file.name).toLowerCase();
  if (!PACKAGE_EXTENSIONS.has(extension)) {
    throw new UploadValidationError('Chỉ chấp nhận ZIP, RAR hoặc 7Z.', 'INVALID_PACKAGE_TYPE');
  }
  if (file.size <= 0 || file.size > maxBytes) {
    throw new UploadValidationError('Dung lượng gói mod không hợp lệ.', 'INVALID_PACKAGE_SIZE');
  }
  return { safeName: safeFileName(file.name) };
}
