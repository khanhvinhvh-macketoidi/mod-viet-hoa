export type CommunityMediaKind = 'ICON' | 'GIF';

export type CommunityMediaAsset = {
  id: string;
  label: string;
  kind: CommunityMediaKind;
  src: string;
};

export const DEFAULT_COMMUNITY_MEDIA_ASSETS:
readonly CommunityMediaAsset[] = [
  {
    id: 'icon-heart-seal',
    label: 'Tâm ấn',
    kind: 'ICON',
    src: '/community-media/icons/heart-seal.svg',
  },
  {
    id: 'icon-jade-sword',
    label: 'Ngọc kiếm',
    kind: 'ICON',
    src: '/community-media/icons/jade-sword.svg',
  },
  {
    id: 'icon-scroll',
    label: 'Bí tịch',
    kind: 'ICON',
    src: '/community-media/icons/scroll.svg',
  },
  {
    id: 'icon-bug',
    label: 'Báo lỗi',
    kind: 'ICON',
    src: '/community-media/icons/bug.svg',
  },
  {
    id: 'gif-applause',
    label: 'Tán thưởng',
    kind: 'GIF',
    src: '/community-media/gifs/applause.gif',
  },
  {
    id: 'gif-sparkle',
    label: 'Linh quang',
    kind: 'GIF',
    src: '/community-media/gifs/sparkle.gif',
  },
  {
    id: 'gif-thinking',
    label: 'Suy ngẫm',
    kind: 'GIF',
    src: '/community-media/gifs/thinking.gif',
  },
  {
    id: 'gif-cheer',
    label: 'Cổ vũ',
    kind: 'GIF',
    src: '/community-media/gifs/cheer.gif',
  },
] as const;

const ID_PATTERN = /^[a-z0-9][a-z0-9_-]{1,63}$/;
const SAFE_ICON_SOURCE =
  /^\/community-media\/icons\/[a-zA-Z0-9._-]+\.(?:svg|png|webp|jpe?g)$/i;
const SAFE_GIF_SOURCE =
  /^\/community-media\/gifs\/[a-zA-Z0-9._-]+\.(?:gif|webp)$/i;

export function normalizeCommunityMediaAssets(
  input: unknown,
): CommunityMediaAsset[] {
  if (!Array.isArray(input)) {
    return [...DEFAULT_COMMUNITY_MEDIA_ASSETS];
  }

  const seen = new Set<string>();
  const normalized: CommunityMediaAsset[] = [];

  for (const item of input) {
    if (!item || typeof item !== 'object') continue;

    const source = item as Record<string, unknown>;
    const id = String(source.id ?? '').trim().toLowerCase();
    const label = String(source.label ?? '').trim().slice(0, 60);
    const kind = String(source.kind ?? '').trim().toUpperCase();
    const src = String(source.src ?? '').trim();

    if (
      !ID_PATTERN.test(id) ||
      !label ||
      (kind !== 'ICON' && kind !== 'GIF') ||
      seen.has(id)
    ) {
      continue;
    }

    const safeSource = kind === 'ICON'
      ? SAFE_ICON_SOURCE.test(src)
      : SAFE_GIF_SOURCE.test(src);

    if (!safeSource || src.includes('..')) continue;

    seen.add(id);
    normalized.push({
      id,
      label,
      kind,
      src,
    });
  }

  return normalized.length > 0
    ? normalized
    : [...DEFAULT_COMMUNITY_MEDIA_ASSETS];
}

export function getCommunityMediaAsset(
  id: string | undefined,
  assets: readonly CommunityMediaAsset[] =
    DEFAULT_COMMUNITY_MEDIA_ASSETS,
): CommunityMediaAsset | undefined {
  if (!id) return undefined;
  return assets.find((asset) => asset.id === id);
}

let browserAssetCache:
readonly CommunityMediaAsset[] | null = null;
let browserAssetRequest:
Promise<readonly CommunityMediaAsset[]> | null = null;

export async function loadCommunityMediaAssets():
Promise<readonly CommunityMediaAsset[]> {
  if (browserAssetCache) return browserAssetCache;
  if (browserAssetRequest) return browserAssetRequest;

  browserAssetRequest = fetch('/api/community-media', {
    cache: 'no-store',
    headers: {
      Accept: 'application/json',
    },
  })
    .then(async (response) => {
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const payload = await response.json() as {
        assets?: unknown;
      };

      return normalizeCommunityMediaAssets(payload.assets);
    })
    .catch(() => [...DEFAULT_COMMUNITY_MEDIA_ASSETS])
    .then((assets) => {
      browserAssetCache = assets;
      return assets;
    })
    .finally(() => {
      browserAssetRequest = null;
    });

  return browserAssetRequest;
}
