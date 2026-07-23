import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import {
  getCollectionBySlug,
  getCollectionItemsByCollectionId,
} from '@/lib/collections';
import { getMods } from '@/lib/mods';
import { getUserById } from '@/lib/users';
import { getFavoriteCountMap } from '@/lib/favorites';
import ModCard from '@/components/ModCard';
import ShareCollectionButton from '@/components/collections/ShareCollectionButton';
import FollowCollectionButton from '@/components/collections/FollowCollectionButton';
import CollectionManager from '@/components/collections/CollectionManager';
import { absoluteUrl, compactDescription, safeJsonLd } from '@/lib/seo';
import {
  getCollectionFollowerCount,
  isFollowingCollection,
} from '@/lib/collection-follows';


type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const collection = await getCollectionBySlug(slug);

  if (!collection || collection.visibility !== 'PUBLIC' || collection.moderationStatus === 'HIDDEN') {
    return {
      title: 'Không tìm thấy Tàng Kinh Các',
      robots: { index: false, follow: false },
    };
  }

  const description = compactDescription(
    collection.description || `Tàng Kinh Các ${collection.title} trên MOD Việt Hóa.`,
  );
  const canonical = `/collections/${encodeURIComponent(collection.slug)}`;

  return {
    title: collection.title,
    description,
    alternates: { canonical },
    openGraph: {
      type: 'website',
      url: canonical,
      title: collection.title,
      description,
      images: [{ url: absoluteUrl('/opengraph-image'), alt: collection.title }],
    },
    twitter: {
      card: 'summary_large_image',
      title: collection.title,
      description,
      images: [absoluteUrl('/twitter-image')],
    },
  };
}

export default async function PublicCollectionPage({
  params,
}: PageProps) {
  const { slug } = await params;
  const [collection, user] =
    await Promise.all([
      getCollectionBySlug(slug),
      getCurrentUser(),
    ]);

  if (!collection) {
    notFound();
  }

  const canRead =
    collection.visibility === 'PUBLIC' ||
    collection.ownerId === user?.id ||
    user?.role === 'ADMIN';

  if (
    !canRead ||
    (
      collection.moderationStatus === 'HIDDEN' &&
      collection.ownerId !== user?.id &&
      user?.role !== 'ADMIN'
    )
  ) {
    notFound();
  }

  const [
    items,
    mods,
    owner,
    favoriteCountMap,
    followerCount,
    isFollowing,
  ] = await Promise.all([
      getCollectionItemsByCollectionId(
        collection.id,
      ),
      getMods(),
      getUserById(collection.ownerId),
      getFavoriteCountMap(),
      getCollectionFollowerCount(
        collection.id,
      ),
      user &&
      user.id !== collection.ownerId &&
      collection.visibility === 'PUBLIC'
        ? isFollowingCollection(
            collection.id,
            user.id,
          )
        : Promise.resolve(false),
    ]);

  const byId = new Map(
    mods.map((mod) => [mod.id, mod]),
  );

  const collectionMods = items
    .map((item) => byId.get(item.modId))
    .filter(Boolean);

  const isOwner =
    collection.ownerId === user?.id;

  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: collection.title,
    description: collection.description || undefined,
    url: absoluteUrl(`/collections/${collection.slug}`),
    creator: owner
      ? {
          '@type': 'Person',
          name: owner.profile?.displayName || owner.name,
        }
      : undefined,
    hasPart: collectionMods.filter(Boolean).map((mod) => ({
      '@type': 'SoftwareApplication',
      name: mod?.title,
      url: absoluteUrl(`/mods/${mod?.slug}`),
      applicationCategory: 'GameApplication',
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(structuredData) }}
      />
      <main className="mx-auto max-w-6xl px-5 py-12">
      <div className="rounded-3xl border border-white/10 bg-slate-900 p-6 md:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-bold uppercase tracking-wider text-amber-400">
              Tàng Kinh Các
            </p>

            <h1 className="mt-2 text-4xl font-black">
              {collection.title}
            </h1>

            <p className="mt-3 max-w-3xl whitespace-pre-line leading-7 text-slate-400">
              {collection.description ||
                'Chưa có mô tả.'}
            </p>

            <p className="mt-4 text-sm text-slate-500">
              Tạo bởi{' '}
              {owner?.profile?.displayName ||
                owner?.name ||
                'Thành viên'}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {collection.visibility === 'PUBLIC' && (
              <>
                <FollowCollectionButton
                  collectionId={collection.id}
                  initialFollowing={Boolean(isFollowing)}
                  initialCount={followerCount}
                  isLoggedIn={Boolean(user)}
                />
                <ShareCollectionButton />
              </>
            )}
          {isOwner && (
            <>
              <CollectionManager
                collectionId={collection.id}
                collectionTitle={
                  collection.title
                }
                mods={mods.map((item) => ({
                  id: item.id,
                  title: item.title,
                  slug: item.slug,
                  game: item.game,
                  category: item.category,
                  coverUrl: item.coverUrl,
                  version: item.version,
                }))}
                initialModIds={items.map(
                  (item) => item.modId,
                )}
              />

              <Link
                href={`/collections/${collection.slug}/edit`}
                className="rounded-xl border border-white/10 px-4 py-2 font-semibold text-slate-200"
              >
                Chỉnh sửa
              </Link>
            </>
          )}
          </div>
        </div>

        {collection.moderationStatus === 'HIDDEN' && (
          <div className="mt-5 rounded-xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            Tàng Kinh Các này đang bị quản trị viên ẩn.
          </div>
        )}

        {user?.role === 'ADMIN' && (
          <form
            action={`/api/collections/${collection.id}/moderate`}
            method="post"
            className="mt-5"
          >
            <input
              type="hidden"
              name="action"
              value={
                collection.moderationStatus === 'HIDDEN'
                  ? 'show'
                  : 'hide'
              }
            />
            <button
              type="submit"
              className="rounded-xl border border-red-400/20 bg-red-500/10 px-4 py-2 text-sm font-semibold text-red-200"
            >
              {collection.moderationStatus === 'HIDDEN'
                ? 'Hiện lại collection'
                : 'Ẩn collection'}
            </button>
          </form>
        )}
      </div>

      {collectionMods.length > 0 ? (
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {collectionMods.map((mod) =>
            mod ? (
              <ModCard
                key={mod.id}
                mod={mod}
                favoriteCount={
                  favoriteCountMap[mod.id] ?? 0
                }
              />
            ) : null,
          )}
        </div>
      ) : (
        <div className="mt-8 rounded-2xl border border-dashed border-white/10 p-12 text-center text-slate-400">
          <p>Tàng Kinh Các chưa có mod nào.</p>

          {isOwner && (
            <div className="mt-5 flex justify-center">
              <CollectionManager
                collectionId={collection.id}
                collectionTitle={
                  collection.title
                }
                mods={mods.map((item) => ({
                  id: item.id,
                  title: item.title,
                  slug: item.slug,
                  game: item.game,
                  category: item.category,
                  coverUrl: item.coverUrl,
                  version: item.version,
                }))}
                initialModIds={items.map(
                  (item) => item.modId,
                )}
              />
            </div>
          )}
        </div>
      )}
      </main>
    </>
  );
}
