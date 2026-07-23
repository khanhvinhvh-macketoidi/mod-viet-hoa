import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { getFavoriteCountMap } from '@/lib/favorites';
import { getSocialFeed } from '@/lib/social-feed';
import FeedCard from '@/components/feed/FeedCard';

export default async function FeedPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login?next=/feed');
  }

  const [entries, favoriteCountMap] =
    await Promise.all([
      getSocialFeed(user.id),
      getFavoriteCountMap(),
    ]);

  return (
    <main className="mx-auto max-w-5xl px-5 py-12">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-bold uppercase tracking-wider text-sky-400">
            Milestone 11
          </p>

          <h1 className="mt-2 text-4xl font-black">
            Bảng tin của đạo hữu
          </h1>

          <p className="mt-2 text-slate-400">
            Mod mới từ tác giả và Tàng Kinh Các đạo hữu đang theo dõi.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            href="/profile/following"
            className="rounded-xl border border-white/10 px-4 py-2 text-sm font-semibold text-slate-200"
          >
            Tác giả đang theo dõi
          </Link>

          <Link
            href="/profile/collections/following"
            className="rounded-xl border border-white/10 px-4 py-2 text-sm font-semibold text-slate-200"
          >
            Collection đang theo dõi
          </Link>
        </div>
      </div>

      {entries.length > 0 ? (
        <div className="mt-8 space-y-6">
          {entries.map((entry) => (
            <FeedCard
              key={entry.id}
              entry={entry}
              favoriteCount={
                favoriteCountMap[
                  entry.mod.id
                ] ?? 0
              }
            />
          ))}
        </div>
      ) : (
        <div className="mt-8 rounded-3xl border border-dashed border-white/10 px-6 py-16 text-center">
          <h2 className="text-xl font-bold text-slate-200">
            Bảng tin chưa có nội dung
          </h2>

          <p className="mt-2 text-slate-500">
            Hãy theo dõi thêm tác giả hoặc collection công khai.
          </p>

          <Link
            href="/discover"
            className="mt-5 inline-flex rounded-xl bg-amber-400 px-5 py-3 font-bold text-slate-950"
          >
            Khám phá nội dung
          </Link>
        </div>
      )}
    </main>
  );
}
