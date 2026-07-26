'use client';

import { useEffect, useState } from 'react';

import {
  DEFAULT_COMMUNITY_MEDIA_ASSETS,
  getCommunityMediaAsset,
  loadCommunityMediaAssets,
  type CommunityMediaAsset,
} from '@/lib/community-media';

type Props = {
  assetId?: string;
};

export default function CommunityMediaDisplay({ assetId }: Props) {
  const [assets, setAssets] = useState<readonly CommunityMediaAsset[]>(
    DEFAULT_COMMUNITY_MEDIA_ASSETS,
  );

  useEffect(() => {
    let active = true;

    void loadCommunityMediaAssets().then((nextAssets) => {
      if (active) setAssets(nextAssets);
    });

    return () => {
      active = false;
    };
  }, []);

  const asset = getCommunityMediaAsset(assetId, assets);
  if (!asset) return null;

  return (
    <div className="mt-4">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={asset.src}
        alt={asset.label}
        loading="lazy"
        className={asset.kind === 'GIF'
          ? 'max-h-52 max-w-full rounded-2xl border border-white/10 bg-slate-950/60 object-contain'
          : 'h-24 w-28 rounded-2xl border border-white/10 bg-slate-950/60 object-contain p-2'}
      />
    </div>
  );
}
