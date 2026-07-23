import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import {
  getCollectionItems,
  getCollectionsByOwnerId,
} from '@/lib/collections';
import CollectionCard from '@/components/collections/CollectionCard';

export default async function CollectionsPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login?next=/profile/collections');
  }

  const [collections, items] =
    await Promise.all([
      getCollectionsByOwnerId(user.id),
      getCollectionItems(),
    ]);

  const counts: Record<string, number> = {};

  for (const item of items) {
    counts[item.collectionId] =
      (counts[item.collectionId] ?? 0) + 1;
  }

  return (
    <main className="mx-auto max-w-6xl px-5 py-12">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black">
            Tàng Kinh Các của tôi
          </h1>
          <p className="mt-2 text-slate-400">
            Tổ chức mod theo chủ đề, game hoặc mục đích sử dụng.
          </p>
        </div>

        <Link
          href="/profile/collections/new"
          className="rounded-xl bg-amber-400 px-5 py-3 font-bold text-slate-950"
        >
          Tạo Tàng Kinh Các
        </Link>
      </div>

      {collections.length > 0 ? (
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {collections.map((collection) => (
            <CollectionCard
              key={collection.id}
              collection={collection}
              itemCount={
                counts[collection.id] ?? 0
              }
            />
          ))}
        </div>
      ) : (
        <div className="mt-8 rounded-2xl border border-dashed border-white/10 p-12 text-center text-slate-400">
          Đạo hữu chưa tạo Tàng Kinh Các nào.
        </div>
      )}
    </main>
  );
}
