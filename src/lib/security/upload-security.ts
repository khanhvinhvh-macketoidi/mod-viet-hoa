import 'server-only';

import path from 'node:path';
import {
  MAX_GALLERY_FILES,
  MAX_IMAGE_FILE_BYTES,
  MAX_MOD_FILE_BYTES,
  MAX_MOD_METADATA_REQUEST_BYTES,
} from '@/lib/upload-limits';

export {
  MAX_GALLERY_FILES,
  MAX_IMAGE_FILE_BYTES,
  MAX_MOD_FILE_BYTES,
  MAX_MOD_METADATA_REQUEST_BYTES,
};

const ALLOWED_ARCHIVE_EXTENSIONS = new Set([
  '.zip',
  '.rar',
  '.7z',
]);

const ALLOWED_IMAGE_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
]);

export function safeFileName(value: string): string {
  const baseName = path.basename(value).normalize('NFKC');

  const cleaned = baseName
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^\.+/, '')
    .slice(0, 120);

  return cleaned || 'upload.bin';
}

export function validateArchiveMetadata(
  fileName: string,
  fileSize: number,
): void {
  if (
    !Number.isSafeInteger(fileSize) ||
    fileSize <= 0 ||
    fileSize > MAX_MOD_FILE_BYTES
  ) {
    throw new Error('Dung lượng file mod không hợp lệ hoặc vượt quá 500 MB.');
  }

  const extension = path.extname(fileName).toLowerCase();

  if (!ALLOWED_ARCHIVE_EXTENSIONS.has(extension)) {
    throw new Error(
      'File mod phải được đóng gói ở định dạng ZIP, RAR hoặc 7Z.',
    );
  }
}

export function validateArchiveFile(file: File): void {
  validateArchiveMetadata(file.name, file.size);
}

function looksLikeJpeg(buffer: Uint8Array): boolean {
  return (
    buffer.length >= 3 &&
    buffer[0] === 0xff &&
    buffer[1] === 0xd8 &&
    buffer[2] === 0xff
  );
}

function looksLikePng(buffer: Uint8Array): boolean {
  const signature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

  return (
    buffer.length >= signature.length &&
    signature.every((value, index) => buffer[index] === value)
  );
}

function looksLikeWebp(buffer: Uint8Array): boolean {
  if (buffer.length < 12) return false;

  const text = new TextDecoder('ascii').decode(buffer.slice(0, 12));
  return text.startsWith('RIFF') && text.endsWith('WEBP');
}

export async function validateImageFile(
  file: File,
  label: string,
): Promise<void> {
  if (
    file.size <= 0 ||
    file.size > MAX_IMAGE_FILE_BYTES ||
    !ALLOWED_IMAGE_MIME_TYPES.has(file.type)
  ) {
    throw new Error(`${label} không hợp lệ hoặc vượt quá 2 MB.`);
  }

  const header = new Uint8Array(
    await file.slice(0, 16).arrayBuffer(),
  );

  const validSignature =
    (file.type === 'image/jpeg' && looksLikeJpeg(header)) ||
    (file.type === 'image/png' && looksLikePng(header)) ||
    (file.type === 'image/webp' && looksLikeWebp(header));

  if (!validSignature) {
    throw new Error(`${label} không đúng định dạng ảnh khai báo.`);
  }
}

export function cleanText(
  value: FormDataEntryValue | null,
  maximumLength: number,
): string {
  return String(value ?? '')
    .replace(/\u0000/g, '')
    .trim()
    .slice(0, maximumLength);
}

export function parseAccessLevel(
  value: FormDataEntryValue | null,
): 'PUBLIC' | 'MEMBER' | 'VIP' {
  const normalized = String(value ?? 'PUBLIC').toUpperCase();

  if (
    normalized === 'PUBLIC' ||
    normalized === 'MEMBER' ||
    normalized === 'VIP'
  ) {
    return normalized;
  }

  return 'PUBLIC';
}
