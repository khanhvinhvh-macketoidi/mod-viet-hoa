import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import {
  getCollectionById,
  getCollections,
  saveCollections,
} from '@/lib/collections';


import { createSafeRedirectUrl } from '@/lib/production/url';
export async function POST(
  request: Request,
  {
    params,
  }: {
    params: Promise<{ id: string }>;
  },
) {
  const user = await getCurrentUser();

  if (!user || user.role !== 'ADMIN') {
    return new Response('Forbidden', {
      status: 403,
    });
  }

  const { id } = await params;
  const collection =
    await getCollectionById(id);

  if (!collection) {
    return new Response('Not found', {
      status: 404,
    });
  }

  const formData = await request.formData();
  const action = String(
    formData.get('action') ?? '',
  );

  const collections = await getCollections();
  const now = new Date().toISOString();

  const next = collections.map((item) =>
    item.id === id
      ? {
          ...item,
          moderationStatus:
            action === 'show'
              ? ('VISIBLE' as const)
              : ('HIDDEN' as const),
          moderatedByUserId: user.id,
          moderatedAt: now,
          updatedAt: now,
        }
      : item,
  );

  await saveCollections(next);

  return NextResponse.redirect(
    createSafeRedirectUrl(
      `/collections/${collection.slug}`, request),
    303,
  );
}
