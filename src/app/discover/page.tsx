import Link from 'next/link';
import ModCard from '@/components/ModCard';
import SmartSearchBar from '@/components/search/SmartSearchBar';
import {
  getCommentCountMap,
  getMods,
  getReviewStatsMap,
} from '@/lib/store';
import { getFavoriteCountMap } from '@/lib/favorites';
import { getTrendingScore } from '@/lib/recommendations';
import { getTopSearchQueries } from '@/lib/search-analytics';

export default async function DiscoverPage() {
  const [
    mods,
    reviewMap,
    commentMap,
    favoriteMap,
    topQueries,
  ] = await Promise.all([
    getMods(),
    getReviewStatsMap(),
    getCommentCountMap(),
    getFavoriteCountMap(),
    getTopSearchQueries(8),
  ]);

  const enriched = mods.map((mod) => {
    const review =
      reviewMap[mod.id] ?? {
        average: 0,
        count: 0,
      };

    const favoriteCount =
      favoriteMap[mod.id] ?? 0;
    const commentCount =
      commentMap[mod.id] ?? 0;

    return {
      mod,
      ratingAverage: review.average,
      ratingCount: review.count,
      favoriteCount,
      commentCount,
      trendingScore: getTrendingScore(
        mod,
        {
          favoriteCount,
          commentCount,
          ratingAverage: review.average,
          ratingCount: review.count,
        },
      ),
    };
  });

  const trending = [...enriched]
    .sort(
      (a, b) =>
        b.trendingScore -
        a.trendingScore,
    )
    .slice(0, 6);

  const mostLoved = [...enriched]
    .sort(
      (a, b) =>
        b.favoriteCount -
        a.favoriteCount,
    )
    .slice(0, 6);

  const newest = [...enriched]
    .sort(
      (a, b) =>
        new Date(
          b.mod.createdAt,
        ).getTime() -
        new Date(
          a.mod.createdAt,
        ).getTime(),
    )
    .slice(0, 6);

  const sections = [
    {
      title: '🔥 Đang thịnh hành',
      description:
        'Kết hợp lượt tải, tâm đắc, luận bàn, luận đạo và độ mới.',
      items: trending,
      href: '/mods?sort=trending',
    },
    {
      title: '❤️ Được tâm đắc nhất',
      description:
        'Những mod được cộng đồng lưu lại nhiều nhất.',
      items: mostLoved,
      href: '/mods?sort=favorites',
    },
    {
      title: '🆕 Phát hành mới',
      description:
        'Các bản mod mới được đăng gần đây.',
      items: newest,
      href: '/mods?sort=newest',
    },
  ];

  return (
    <main className="mx-auto max-w-7xl px-5 py-12">
      <section className="rounded-3xl border border-white/10 bg-gradient-to-br from-amber-400/10 via-slate-900 to-slate-950 p-6 md:p-9">
        <p className="text-sm font-bold uppercase tracking-wider text-amber-400">
          Milestone 10
        </p>

        <h1 className="mt-2 text-4xl font-black md:text-5xl">
          Khám phá mod phù hợp với đạo hữu
        </h1>

        <p className="mt-3 max-w-3xl leading-7 text-slate-400">
          Tìm kiếm thông minh, tag, nội dung thịnh hành và các bảng xếp hạng cộng đồng.
        </p>

        <div className="mt-7 max-w-3xl">
          <SmartSearchBar />
        </div>

        {topQueries.length > 0 && (
          <div className="mt-5 flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Đang được tìm:
            </span>

            {topQueries.map((item) => (
              <Link
                key={item.query}
                href={`/mods?q=${encodeURIComponent(
                  item.query,
                )}`}
                className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300 hover:border-amber-400/30"
              >
                {item.query}
              </Link>
            ))}
          </div>
        )}
      </section>

      {sections.map((section) => (
        <section
          key={section.title}
          className="mt-14"
        >
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="text-3xl font-black">
                {section.title}
              </h2>
              <p className="mt-2 text-slate-400">
                {section.description}
              </p>
            </div>

            <Link
              href={section.href}
              className="text-sm font-semibold text-amber-300"
            >
              Xem tất cả →
            </Link>
          </div>

          <div className="mt-7 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {section.items.map((item) => (
              <ModCard
                key={item.mod.id}
                mod={item.mod}
                ratingAverage={
                  item.ratingAverage
                }
                ratingCount={
                  item.ratingCount
                }
                commentCount={
                  item.commentCount
                }
                favoriteCount={
                  item.favoriteCount
                }
              />
            ))}
          </div>
        </section>
      ))}
    </main>
  );
}
