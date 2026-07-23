import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { readJson, writeJson } from './json-store';

export interface CollectionFollowItem {
  id: string;
  collectionId: string;
  userId: string;
  createdAt: string;
}

const collectionFollowsPath = path.join(
  process.cwd(),
  'data',
  'collection-followers.json',
);

export async function getCollectionFollows(): Promise<
  CollectionFollowItem[]
> {
  return readJson<CollectionFollowItem[]>(
    collectionFollowsPath,
    [],
  );
}

export async function saveCollectionFollows(
  follows: CollectionFollowItem[],
): Promise<void> {
  await writeJson(collectionFollowsPath, follows);
}

export async function isFollowingCollection(
  collectionId: string,
  userId: string,
): Promise<boolean> {
  const follows = await getCollectionFollows();

  return follows.some(
    (item) =>
      item.collectionId === collectionId &&
      item.userId === userId,
  );
}

export async function toggleCollectionFollow(
  collectionId: string,
  userId: string,
): Promise<{
  following: boolean;
  count: number;
}> {
  const follows = await getCollectionFollows();
  const index = follows.findIndex(
    (item) =>
      item.collectionId === collectionId &&
      item.userId === userId,
  );

  let following = false;

  if (index >= 0) {
    follows.splice(index, 1);
  } else {
    follows.push({
      id: randomUUID(),
      collectionId,
      userId,
      createdAt: new Date().toISOString(),
    });

    following = true;
  }

  await saveCollectionFollows(follows);

  return {
    following,
    count: follows.filter(
      (item) =>
        item.collectionId === collectionId,
    ).length,
  };
}

export async function getCollectionFollowerCount(
  collectionId: string,
): Promise<number> {
  const follows = await getCollectionFollows();

  return follows.filter(
    (item) =>
      item.collectionId === collectionId,
  ).length;
}

export async function getCollectionFollowerIds(
  collectionId: string,
): Promise<string[]> {
  const follows = await getCollectionFollows();

  return follows
    .filter(
      (item) =>
        item.collectionId === collectionId,
    )
    .map((item) => item.userId);
}

export async function getFollowedCollectionIds(
  userId: string,
): Promise<string[]> {
  const follows = await getCollectionFollows();

  return follows
    .filter((item) => item.userId === userId)
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() -
        new Date(a.createdAt).getTime(),
    )
    .map((item) => item.collectionId);
}
