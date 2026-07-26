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

const RETRYABLE_FILE_SYSTEM_CODES = new Set([
  'EPERM',
  'EBUSY',
  'EACCES',
]);

const FILE_SYSTEM_RETRY_DELAYS_MS = [
  20,
  40,
  80,
  160,
  320,
  640,
  1_000,
  1_000,
];

function errorCode(error: unknown): string {
  return typeof error === 'object' &&
    error !== null &&
    'code' in error
    ? String(error.code)
    : '';
}

function lockKey(filePath: string): string {
  const resolved = path.resolve(filePath);
  return process.platform === 'win32'
    ? resolved.toLocaleLowerCase('en-US')
    : resolved;
}

async function wait(milliseconds: number): Promise<void> {
  await new Promise<void>((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}

async function retryFileSystemOperation<T>(
  operation: () => Promise<T>,
): Promise<T> {
  let lastError: unknown;

  for (
    let attempt = 0;
    attempt <= FILE_SYSTEM_RETRY_DELAYS_MS.length;
    attempt += 1
  ) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;

      if (
        !RETRYABLE_FILE_SYSTEM_CODES.has(errorCode(error)) ||
        attempt >= FILE_SYSTEM_RETRY_DELAYS_MS.length
      ) {
        throw error;
      }

      await wait(FILE_SYSTEM_RETRY_DELAYS_MS[attempt] ?? 1_000);
    }
  }

  throw lastError;
}

async function withFileLock<T>(
  filePath: string,
  operation: () => Promise<T>,
): Promise<T> {
  const key = lockKey(filePath);
  const previous = locks.get(key) ?? Promise.resolve();

  let release!: () => void;
  const current = new Promise<void>((resolve) => {
    release = resolve;
  });
  const queued = previous.then(() => current);

  locks.set(key, queued);
  await previous;

  try {
    return await operation();
  } finally {
    release();

    if (locks.get(key) === queued) {
      locks.delete(key);
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
      await retryFileSystemOperation(() =>
        fs.copyFile(filePath, backupPath),
      );
    } catch (error) {
      if (errorCode(error) !== 'ENOENT') throw error;
    }

    try {
      const handle = await fs.open(temporaryPath, 'wx');

      try {
        await handle.writeFile(serialized, {
          encoding: 'utf8',
        });
        await handle.sync();
      } finally {
        await handle.close();
      }

      await retryFileSystemOperation(() =>
        fs.rename(temporaryPath, filePath),
      );
    } catch (error) {
      await retryFileSystemOperation(() =>
        fs.rm(temporaryPath, { force: true }),
      ).catch(() => undefined);

      throw error;
    }
  });
}
