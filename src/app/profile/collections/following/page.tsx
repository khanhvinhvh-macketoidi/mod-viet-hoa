import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import {
  getCollectionItemCountMap,
  getCollections,
} from '@/lib/collections';
import { getFollowedCollectionIds } from '@/lib/collection-follows';
import CollectionCard from '@/components/collections/CollectionCard';

export default async function FollowingCollectionsPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect(
      '/login?next=/profile/collections/following',
    );
  }

  const [
    followedIds,
    collections,
    countMap,
  ] = await Promise.all([
    getFollowedCollectionIds(user.id),
    getCollections(),
    getCollectionItemCountMap(),
  ]);

  const byId = new Map(
    collections.map((collection) => [
      collection.id,
      collection,
    ]),
  );

  const followedCollections = followedIds
    .map((id) => byId.get(id))
    .filter(
      (
        collection,
      ): collection is NonNullable<
        typeof collection
      > =>
        Boolean(collection) &&
        collection?.visibility === 'PUBLIC' &&
        collection?.moderationStatus !== 'HIDDEN',
    );

  return (
    <main className="mx-auto max-w-6xl px-5 py-12">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black">
            Collection đang theo dõi
          </h1>

          <p className="mt-2 text-slate-400">
            Các Tàng Kinh Các công khai đạo hữu đã đăng ký theo dõi.
          </p>
        </div>

        <Link
          href="/feed"
          className="rounded-xl border border-white/10 px-4 py-2 font-semibold text-slate-200"
        >
          Mở bảng tin
        </Link>
      </div>

      {followedCollections.length > 0 ? (
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {followedCollections.map(
            (collection) => (
              <CollectionCard
                key={collection.id}
                collection={collection}
                itemCount={
                  countMap[collection.id] ?? 0
                }
              />
            ),
          )}
        </div>
      ) : (
        <div className="mt-8 rounded-2xl border border-dashed border-white/10 p-12 text-center text-slate-400">
          Đạo hữu chưa theo dõi collection nào.
        </div>
      )}
    </main>
  );
}
