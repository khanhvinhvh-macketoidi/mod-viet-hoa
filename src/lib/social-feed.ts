import type {
  ModCollection,
  ModItem,
  User,
} from './types';
import {
  getCollectionItems,
  getCollections,
} from './collections';
import { getFollowedCollectionIds } from './collection-follows';
import { getMods } from './mods';
import { getFollowingIds } from './follows';
import { getUsers } from './users';

export type FeedEntry =
  | {
      id: string;
      type: 'AUTHOR_MOD';
      createdAt: string;
      mod: ModItem;
      author?: User;
    }
  | {
      id: string;
      type: 'COLLECTION_MOD';
      createdAt: string;
      mod: ModItem;
      collection: ModCollection;
      owner?: User;
    };

export async function getSocialFeed(
  userId: string,
  limit = 60,
): Promise<FeedEntry[]> {
  const [
    followingAuthorIds,
    followedCollectionIds,
    mods,
    collections,
    collectionItems,
    users,
  ] = await Promise.all([
    getFollowingIds(userId),
    getFollowedCollectionIds(userId),
    getMods(),
    getCollections(),
    getCollectionItems(),
    getUsers(),
  ]);

  const followingAuthorSet = new Set(
    followingAuthorIds,
  );
  const followedCollectionSet = new Set(
    followedCollectionIds,
  );
  const usersById = new Map(
    users.map((user) => [user.id, user]),
  );
  const modsById = new Map(
    mods.map((mod) => [mod.id, mod]),
  );
  const collectionsById = new Map(
    collections.map((collection) => [
      collection.id,
      collection,
    ]),
  );

  const authorEntries: FeedEntry[] = mods
    .filter(
      (mod) =>
        Boolean(mod.authorId) &&
        followingAuthorSet.has(
          mod.authorId as string,
        ),
    )
    .map((mod) => ({
      id: `author-mod:${mod.id}`,
      type: 'AUTHOR_MOD' as const,
      createdAt: mod.createdAt,
      mod,
      author: mod.authorId
        ? usersById.get(mod.authorId)
        : undefined,
    }));

  const collectionEntries: FeedEntry[] =
    collectionItems
      .filter((item) =>
        followedCollectionSet.has(
          item.collectionId,
        ),
      )
      .flatMap((item) => {
        const collection =
          collectionsById.get(
            item.collectionId,
          );
        const mod = modsById.get(item.modId);

        if (
          !collection ||
          !mod ||
          collection.visibility !== 'PUBLIC' ||
          collection.moderationStatus === 'HIDDEN'
        ) {
          return [];
        }

        return [
          {
            id: `collection-mod:${item.collectionId}:${item.modId}`,
            type: 'COLLECTION_MOD' as const,
            createdAt: item.createdAt,
            mod,
            collection,
            owner: usersById.get(
              collection.ownerId,
            ),
          },
        ];
      });

  const seen = new Set<string>();

  return [
    ...authorEntries,
    ...collectionEntries,
  ]
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() -
        new Date(a.createdAt).getTime(),
    )
    .filter((entry) => {
      const key = `${entry.type}:${entry.id}`;

      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, limit);
}
