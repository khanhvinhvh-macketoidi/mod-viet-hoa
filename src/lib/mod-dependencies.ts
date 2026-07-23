import path from 'node:path';
import { randomUUID } from 'node:crypto';
import type {
  ModDependency,
  ModDependencyType,
} from './types';
import { readJson, writeJson } from './json-store';

const dependenciesPath = path.join(
  process.cwd(),
  'data',
  'mod-dependencies.json',
);

export async function getModDependencies(): Promise<
  ModDependency[]
> {
  return readJson<ModDependency[]>(
    dependenciesPath,
    [],
  );
}

export async function saveModDependencies(
  dependencies: ModDependency[],
): Promise<void> {
  await writeJson(
    dependenciesPath,
    dependencies,
  );
}

export async function getDependenciesByModId(
  modId: string,
): Promise<ModDependency[]> {
  return (await getModDependencies())
    .filter((item) => item.modId === modId)
    .sort(
      (a, b) =>
        a.sortOrder - b.sortOrder ||
        a.createdAt.localeCompare(b.createdAt),
    );
}

export async function replaceModDependencies(
  modId: string,
  items: Array<{
    dependencyModId?: string;
    externalName?: string;
    externalUrl?: string;
    type: ModDependencyType;
    note: string;
  }>,
): Promise<ModDependency[]> {
  const all = await getModDependencies();
  const now = new Date().toISOString();

  const normalized = items
    .filter(
      (item) =>
        Boolean(item.dependencyModId) ||
        Boolean(item.externalName?.trim()),
    )
    .slice(0, 30)
    .map((item, index) => ({
      id: randomUUID(),
      modId,
      dependencyModId:
        item.dependencyModId || undefined,
      externalName:
        item.externalName?.trim() || undefined,
      externalUrl:
        item.externalUrl?.trim() || undefined,
      type:
        item.type === 'OPTIONAL'
          ? ('OPTIONAL' as const)
          : ('REQUIRED' as const),
      note: item.note.trim().slice(0, 500),
      sortOrder: index,
      createdAt: now,
    }));

  await saveModDependencies([
    ...all.filter(
      (item) => item.modId !== modId,
    ),
    ...normalized,
  ]);

  return normalized;
}
