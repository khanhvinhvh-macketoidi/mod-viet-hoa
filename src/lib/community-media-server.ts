import { readFile, stat } from 'fs/promises';
import path from 'path';

import {
  DEFAULT_COMMUNITY_MEDIA_ASSETS,
  normalizeCommunityMediaAssets,
  type CommunityMediaAsset,
} from '@/lib/community-media';

const MANIFEST_PATH = path.join(
  process.cwd(),
  'public',
  'community-media',
  'library.json',
);

function sourceToAbsolutePath(source: string): string {
  return path.join(
    process.cwd(),
    'public',
    ...source.replace(/^\//, '').split('/'),
  );
}

async function assetFileExists(asset: CommunityMediaAsset): Promise<boolean> {
  try {
    const info = await stat(sourceToAbsolutePath(asset.src));
    return info.isFile();
  } catch {
    return false;
  }
}

export async function getCommunityMediaAssets():
Promise<CommunityMediaAsset[]> {
  try {
    const raw = await readFile(MANIFEST_PATH, 'utf8');
    const parsed = JSON.parse(raw) as unknown;
    const normalized = normalizeCommunityMediaAssets(parsed);
    const existing = (
      await Promise.all(
        normalized.map(async (asset) => ({
          asset,
          exists: await assetFileExists(asset),
        })),
      )
    )
      .filter((entry) => entry.exists)
      .map((entry) => entry.asset);

    return existing.length > 0
      ? existing
      : [...DEFAULT_COMMUNITY_MEDIA_ASSETS];
  } catch {
    return [...DEFAULT_COMMUNITY_MEDIA_ASSETS];
  }
}

export async function isCommunityMediaAssetId(
  value: string,
): Promise<boolean> {
  const assets = await getCommunityMediaAssets();
  return assets.some((asset) => asset.id === value);
}
