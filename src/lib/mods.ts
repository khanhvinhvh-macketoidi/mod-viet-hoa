import type { ModItem } from './types';
import { modsPath } from './data-paths';
import { readJson, writeJson } from './json-store';

export async function getMods(): Promise<ModItem[]> {
  return readJson<ModItem[]>(modsPath, []);
}

export async function saveMods(mods: ModItem[]): Promise<void> {
  await writeJson(modsPath, mods);
}

export async function getModBySlug(
  slug: string,
): Promise<ModItem | undefined> {
  return (await getMods()).find((mod) => mod.slug === slug);
}

export async function getModById(id: string): Promise<ModItem | undefined> {
  return (await getMods()).find((mod) => mod.id === id);
}

export async function getModsByAuthorId(authorId: string): Promise<ModItem[]> {
  return (await getMods())
    .filter((mod) => mod.authorId === authorId)
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
}
