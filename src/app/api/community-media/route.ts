import { NextResponse } from 'next/server';

import { getCommunityMediaAssets } from '@/lib/community-media-server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const assets = await getCommunityMediaAssets();

  return NextResponse.json(
    { assets },
    {
      headers: {
        'Cache-Control': 'no-store, max-age=0',
      },
    },
  );
}
