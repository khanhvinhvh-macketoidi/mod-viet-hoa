import path from 'node:path';

export const dataDir = path.join(process.cwd(), 'data');
export const usersPath = path.join(dataDir, 'users.json');
export const modsPath = path.join(dataDir, 'mods.json');
export const commentsPath = path.join(dataDir, 'comments.json');
export const reviewsPath = path.join(dataDir, 'reviews.json');
export const backupsDir = path.join(dataDir, 'backups');
export const migrationsDir = path.join(dataDir, 'migrations');

export const modFavoritesPath = path.join(
  dataDir,
  'mod-favorites.json',
);

export const collectionsPath = path.join(
  dataDir,
  'collections.json',
);

export const collectionItemsPath = path.join(
  dataDir,
  'collection-items.json',
);