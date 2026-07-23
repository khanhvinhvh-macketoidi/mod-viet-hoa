import 'server-only';

import fs from 'node:fs/promises';
import path from 'node:path';

const globalLocks = globalThis as typeof globalThis & {
  __modLibraryJsonLocks?: Map<string, Promise<void>>;
};

const locks =
  globalLocks.__modLibraryJsonLocks ??
  new Map<string, Promise<void>>();

globalLocks.__modLibraryJsonLocks = locks;

async function withFileLock<T>(
  filePath: string,
  operation: () => Promise<T>,
): Promise<T> {
  const normalizedPath = path.resolve(filePath);
  const previous = locks.get(normalizedPath) ?? Promise.resolve();

  let release!: () => void;
  const current = new Promise<void>((resolve) => {
    release = resolve;
  });

  locks.set(normalizedPath, previous.then(() => current));
  await previous;

  try {
    return await operation();
  } finally {
    release();

    if (locks.get(normalizedPath) === current) {
      locks.delete(normalizedPath);
    }
  }
}

export async function readJsonAtomic<T>(
  filePath: string,
  fallback: T,
): Promise<T> {
  try {
    const content = await fs.readFile(filePath, 'utf8');
    return JSON.parse(content) as T;
  } catch (error) {
    const code =
      typeof error === 'object' &&
      error !== null &&
      'code' in error
        ? String(error.code)
        : '';

    if (code === 'ENOENT') {
      return fallback;
    }

    throw error;
  }
}

export async function writeJsonAtomic<T>(
  filePath: string,
  value: T,
): Promise<void> {
  await withFileLock(filePath, async () => {
    const directory = path.dirname(filePath);
    const fileName = path.basename(filePath);
    const temporaryPath = path.join(
      directory,
      `.${fileName}.${process.pid}.${crypto.randomUUID()}.tmp`,
    );
    const backupPath = `${filePath}.bak`;

    await fs.mkdir(directory, { recursive: true });

    const serialized = `${JSON.stringify(value, null, 2)}\n`;

    try {
      await fs.copyFile(filePath, backupPath);
    } catch (error) {
      const code =
        typeof error === 'object' &&
        error !== null &&
        'code' in error
          ? String(error.code)
          : '';

      if (code !== 'ENOENT') throw error;
    }

    try {
      await fs.writeFile(temporaryPath, serialized, {
        encoding: 'utf8',
        flag: 'wx',
      });

      await fs.rename(temporaryPath, filePath);
    } catch (error) {
      await fs.rm(temporaryPath, { force: true });
      throw error;
    }
  });
}
