import path from 'node:path';
import type { ModFavorite } from './types';
import { readJson, writeJson } from './json-store';

const modFavoritesPath = path.join(process.cwd(), 'data', 'mod-favorites.json');

export async function getModFavorites(): Promise<ModFavorite[]> {
  return readJson<ModFavorite[]>(modFavoritesPath, []);
}
export async function saveModFavorites(favorites: ModFavorite[]): Promise<void> {
  await writeJson(modFavoritesPath, favorites);
}
export async function isModFavoritedByUser(modId: string, userId: string): Promise<boolean> {
  return (await getModFavorites()).some((item) => item.modId === modId && item.userId === userId);
}
export async function toggleModFavorite(modId: string, userId: string): Promise<{ favorited: boolean; count: number }> {
  const favorites = await getModFavorites();
  const index = favorites.findIndex((item) => item.modId === modId && item.userId === userId);
  let favorited = false;
  if (index >= 0) favorites.splice(index, 1);
  else {
    favorites.push({ userId, modId, createdAt: new Date().toISOString() });
    favorited = true;
  }
  await saveModFavorites(favorites);
  return { favorited, count: favorites.filter((item) => item.modId === modId).length };
}
export async function getFavoriteCountForMod(modId: string): Promise<number> {
  return (await getModFavorites()).filter((item) => item.modId === modId).length;
}
export async function getFavoriteCountMap(): Promise<Record<string, number>> {
  const result: Record<string, number> = {};
  for (const item of await getModFavorites()) result[item.modId] = (result[item.modId] ?? 0) + 1;
  return result;
}
export async function getFavoriteModIdsByUser(userId: string): Promise<string[]> {
  return (await getModFavorites())
    .filter((item) => item.userId === userId)
    .sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .map((item) => item.modId);
}
