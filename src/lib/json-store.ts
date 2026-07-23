import fs from 'node:fs/promises';
import path from 'node:path';

export async function ensureJsonFile(
  filePath: string,
  initial: unknown,
): Promise<void> {
  await fs.mkdir(path.dirname(filePath), { recursive: true });

  try {
    await fs.access(filePath);
  } catch {
    await fs.writeFile(
      filePath,
      JSON.stringify(initial, null, 2),
      'utf8',
    );
  }
}

export async function readJson<T>(
  filePath: string,
  initial: T,
): Promise<T> {
  await ensureJsonFile(filePath, initial);

  const content = await fs.readFile(filePath, 'utf8');

  if (!content.trim()) {
    return initial;
  }

  try {
    return JSON.parse(content) as T;
  } catch (error) {
    throw new Error(
      `Không thể đọc JSON tại ${filePath}: ${
        error instanceof Error ? error.message : 'Lỗi không xác định'
      }`,
    );
  }
}

export async function writeJson<T>(
  filePath: string,
  value: T,
): Promise<void> {
  await fs.mkdir(path.dirname(filePath), { recursive: true });

  await fs.writeFile(
    filePath,
    JSON.stringify(value, null, 2),
    'utf8',
  );
}

export async function copyFileSafe(
  sourcePath: string,
  destinationPath: string,
): Promise<void> {
  await fs.mkdir(path.dirname(destinationPath), { recursive: true });
  await fs.copyFile(sourcePath, destinationPath);
}

export async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}
