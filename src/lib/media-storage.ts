import 'server-only';

import path from 'node:path';

export type ManagedMediaFolder = 'covers' | 'gallery';

const MANAGED_MEDIA_FOLDERS = new Set<ManagedMediaFolder>([
  'covers',
  'gallery',
]);

const runtimeMediaRoot = path.resolve(
  process.cwd(),
  'storage',
  'public-uploads',
);

const legacyPublicRoot = path.resolve(
  process.cwd(),
  'public',
  'uploads',
);

function isManagedFolder(value: string): value is ManagedMediaFolder {
  return MANAGED_MEDIA_FOLDERS.has(value as ManagedMediaFolder);
}

function safeStoredName(value: string): string | null {
  if (
    !value ||
    value === '.' ||
    value === '..' ||
    value.includes('/') ||
    value.includes('\\') ||
    value.includes(':') ||
    !/^[a-zA-Z0-9._-]+$/.test(value) ||
    path.basename(value) !== value
  ) {
    return null;
  }

  return value;
}

function resolveInsideRoot(
  root: string,
  folder: ManagedMediaFolder,
  storedName: string,
): string | null {
  const safeName = safeStoredName(storedName);

  if (!safeName) {
    return null;
  }

  const folderRoot = path.resolve(root, folder);
  const filePath = path.resolve(folderRoot, safeName);

  if (!filePath.startsWith(`${folderRoot}${path.sep}`)) {
    return null;
  }

  return filePath;
}

export function getManagedMediaDirectory(
  folder: ManagedMediaFolder,
): string {
  return path.resolve(runtimeMediaRoot, folder);
}

export function getManagedMediaFilePath(
  folder: ManagedMediaFolder,
  storedName: string,
): string {
  const resolved = resolveInsideRoot(
    runtimeMediaRoot,
    folder,
    storedName,
  );

  if (!resolved) {
    throw new Error('Invalid managed media file name.');
  }

  return resolved;
}

export function getManagedMediaUrl(
  folder: ManagedMediaFolder,
  storedName: string,
): string {
  const safeName = safeStoredName(storedName);

  if (!safeName) {
    throw new Error('Invalid managed media file name.');
  }

  return `/api/uploads/${folder}/${encodeURIComponent(safeName)}`;
}

/**
 * Resolve both the new runtime-media URL and legacy /uploads URL.
 * This lets deletion/editing work for old and new mods during migration.
 */
export function resolveManagedMediaUrl(
  value: string | undefined,
): string | null {
  if (!value) {
    return null;
  }

  let pathname: string;

  try {
    pathname = new URL(value, 'http://local.invalid').pathname;
  } catch {
    return null;
  }

  const newPrefix = '/api/uploads/';
  const legacyPrefix = '/uploads/';

  let root: string;
  let relative: string;

  if (pathname.startsWith(newPrefix)) {
    root = runtimeMediaRoot;
    relative = pathname.slice(newPrefix.length);
  } else if (pathname.startsWith(legacyPrefix)) {
    root = legacyPublicRoot;
    relative = pathname.slice(legacyPrefix.length);
  } else {
    return null;
  }

  const parts = relative
    .split('/')
    .filter(Boolean)
    .map((part) => {
      try {
        return decodeURIComponent(part);
      } catch {
        return '';
      }
    });

  if (parts.length !== 2) {
    return null;
  }

  const [folder, storedName] = parts;

  if (!folder || !storedName || !isManagedFolder(folder)) {
    return null;
  }

  return resolveInsideRoot(root, folder, storedName);
}

export function resolveRequestedMediaPath(
  segments: string[],
): {
  filePath: string;
  folder: ManagedMediaFolder;
  storedName: string;
} | null {
  if (segments.length !== 2) {
    return null;
  }

  const [folder, storedName] = segments;

  if (!folder || !storedName || !isManagedFolder(folder)) {
    return null;
  }

  const filePath = resolveInsideRoot(
    runtimeMediaRoot,
    folder,
    storedName,
  );

  if (!filePath) {
    return null;
  }

  return {
    filePath,
    folder,
    storedName,
  };
}

export function mediaContentType(storedName: string): string {
  switch (path.extname(storedName).toLowerCase()) {
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg';
    case '.png':
      return 'image/png';
    case '.webp':
      return 'image/webp';
    default:
      return 'application/octet-stream';
  }
}
