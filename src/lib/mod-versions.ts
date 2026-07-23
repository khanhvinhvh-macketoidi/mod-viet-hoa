import path from 'node:path';
import { randomUUID } from 'node:crypto';
import type {
  ModItem,
  ModVersion,
} from './types';
import { readJson, writeJson } from './json-store';

const modVersionsPath = path.join(
  process.cwd(),
  'data',
  'mod-versions.json',
);

export async function getModVersions(): Promise<
  ModVersion[]
> {
  return readJson<ModVersion[]>(
    modVersionsPath,
    [],
  );
}

export async function saveModVersions(
  versions: ModVersion[],
): Promise<void> {
  await writeJson(modVersionsPath, versions);
}

export async function ensureCurrentVersion(
  mod: ModItem,
  createdByUserId = mod.authorId ?? 'system',
): Promise<ModVersion> {
  const versions = await getModVersions();
  const existing = versions.find(
    (item) =>
      item.modId === mod.id &&
      item.isCurrent,
  );

  if (existing) {
    return existing;
  }

  const fallback = versions
    .filter((item) => item.modId === mod.id)
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() -
        new Date(a.createdAt).getTime(),
    )[0];

  if (fallback) {
    const next = versions.map((item) => ({
      ...item,
      isCurrent:
        item.id === fallback.id,
    }));

    await saveModVersions(next);

    return {
      ...fallback,
      isCurrent: true,
    };
  }

  const version: ModVersion = {
    id: randomUUID(),
    modId: mod.id,
    version: mod.version,
    gameVersion: mod.gameVersion,
    changelog:
      'Phiên bản hiện tại được nhập từ dữ liệu mod cũ.',
    fileName: mod.fileName,
    storedFileName: mod.storedFileName,
    fileSize: mod.fileSize,
    downloads: mod.downloads,
    isCurrent: true,
    createdByUserId,
    createdAt: mod.updatedAt || mod.createdAt,
  };

  versions.push(version);
  await saveModVersions(versions);

  return version;
}

export async function getVersionsByModId(
  modId: string,
): Promise<ModVersion[]> {
  return (await getModVersions())
    .filter((item) => item.modId === modId)
    .sort((a, b) => {
      if (a.isCurrent !== b.isCurrent) {
        return a.isCurrent ? -1 : 1;
      }

      return (
        new Date(b.createdAt).getTime() -
        new Date(a.createdAt).getTime()
      );
    });
}

export async function getVersionById(
  versionId: string,
): Promise<ModVersion | undefined> {
  return (await getModVersions()).find(
    (item) => item.id === versionId,
  );
}

export async function createModVersion(input: {
  modId: string;
  version: string;
  gameVersion: string;
  changelog: string;
  fileName: string;
  storedFileName: string;
  fileSize: number;
  createdByUserId: string;
}): Promise<ModVersion> {
  const versions = await getModVersions();
  const now = new Date().toISOString();

  const next = versions.map((item) =>
    item.modId === input.modId
      ? {
          ...item,
          isCurrent: false,
        }
      : item,
  );

  const version: ModVersion = {
    id: randomUUID(),
    modId: input.modId,
    version: input.version,
    gameVersion: input.gameVersion,
    changelog: input.changelog,
    fileName: input.fileName,
    storedFileName: input.storedFileName,
    fileSize: input.fileSize,
    downloads: 0,
    isCurrent: true,
    createdByUserId: input.createdByUserId,
    createdAt: now,
  };

  next.push(version);
  await saveModVersions(next);

  return version;
}

export async function incrementVersionDownloads(
  versionId: string,
): Promise<number> {
  const versions = await getModVersions();
  let nextCount = 0;

  const next = versions.map((item) => {
    if (item.id !== versionId) {
      return item;
    }

    nextCount = item.downloads + 1;

    return {
      ...item,
      downloads: nextCount,
    };
  });

  await saveModVersions(next);
  return nextCount;
}

export async function deleteModVersion(
  versionId: string,
  modId: string,
): Promise<boolean> {
  const versions = await getModVersions();
  const target = versions.find(
    (item) =>
      item.id === versionId &&
      item.modId === modId,
  );

  if (!target || target.isCurrent) {
    return false;
  }

  await saveModVersions(
    versions.filter(
      (item) => item.id !== versionId,
    ),
  );

  return true;
}
