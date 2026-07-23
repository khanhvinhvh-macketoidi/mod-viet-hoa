import Link from 'next/link';
import ModCard from '@/components/ModCard';
import SmartSearchBar from '@/components/search/SmartSearchBar';
import TagBadge from '@/components/tags/TagBadge';
import {
  getCommentCountMap,
  getMods,
  getReviewStatsMap,
} from '@/lib/store';
import { getFavoriteCountMap } from '@/lib/favorites';
import {
  getAllTags,
  searchMods,
} from '@/lib/search';
import { getCurrentUser } from '@/lib/auth';
import { recordSearchQuery } from '@/lib/search-analytics';
import { getTrendingScore } from '@/lib/recommendations';

type ModsPageProps = {
  searchParams: Promise<{
    q?: string;
    category?: string;
    game?: string;
    tag?: string;
    sort?: string;
  }>;
};

export default async function ModsPage({
  searchParams,
}: ModsPageProps) {
  const params = await searchParams;
  const selectedSort =
    params.sort ?? 'newest';
  const searchQuery = params.q?.trim() ?? '';
  const selectedCategory =
    params.category ?? '';
  const selectedGame = params.game ?? '';
  const selectedTag = params.tag ?? '';

  const [
    allMods,
    reviewStatsMap,
    commentCountMap,
    favoriteCountMap,
    user,
  ] = await Promise.all([
    getMods(),
    getReviewStatsMap(),
    getCommentCountMap(),
    getFavoriteCountMap(),
    getCurrentUser(),
  ]);

  const categories = [
    ...new Set(
      allMods.map((mod) => mod.category),
    ),
  ].sort((a, b) =>
    a.localeCompare(b, 'vi'),
  );

  const games = [
    ...new Set(
      allMods.map((mod) => mod.game),
    ),
  ].sort((a, b) =>
    a.localeCompare(b, 'vi'),
  );

  const tags = getAllTags(allMods);

  const searched = searchQuery
    ? searchMods(allMods, searchQuery)
    : allMods.map((mod) => ({
        mod,
        score: 0,
        matchedFields: [],
      }));

  const filtered = searched.filter(
    ({ mod }) => {
      const matchesCategory =
        !selectedCategory ||
        mod.category === selectedCategory;

      const matchesGame =
        !selectedGame ||
        mod.game === selectedGame;

      const matchesTag =
        !selectedTag ||
        (mod.tags ?? []).some(
          (tag) =>
            tag.toLocaleLowerCase('vi') ===
            selectedTag.toLocaleLowerCase(
              'vi',
            ),
        );

      return (
        matchesCategory &&
        matchesGame &&
        matchesTag
      );
    },
  );

  if (searchQuery) {
    await recordSearchQuery({
      query: searchQuery,
      resultCount: filtered.length,
      userId: user?.id,
    });
  }

  const withStats = filtered.map(
    ({ mod, score }) => {
      const review =
        reviewStatsMap[mod.id] ?? {
          average: 0,
          count: 0,
        };

      const favoriteCount =
        favoriteCountMap[mod.id] ?? 0;
      const commentCount =
        commentCountMap[mod.id] ?? 0;

      return {
        mod,
        searchScore: score,
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
    },
  );

  const sortedMods = [...withStats].sort(
    (a, b) => {
      switch (selectedSort) {
        case 'relevance':
          return (
            b.searchScore - a.searchScore
          );

        case 'rating': {
          const scoreA =
            a.ratingCount > 0
              ? a.ratingAverage *
                Math.log10(
                  a.ratingCount + 1,
                )
              : 0;

          const scoreB =
            b.ratingCount > 0
              ? b.ratingAverage *
                Math.log10(
                  b.ratingCount + 1,
                )
              : 0;

          return (
            scoreB - scoreA ||
            b.mod.downloads -
              a.mod.downloads
          );
        }

        case 'review-count':
          return (
            b.ratingCount - a.ratingCount ||
            b.ratingAverage -
              a.ratingAverage
          );

        case 'downloads':
          return (
            b.mod.downloads -
            a.mod.downloads
          );

        case 'favorites':
          return (
            b.favoriteCount -
            a.favoriteCount
          );

        case 'trending':
          return (
            b.trendingScore -
            a.trendingScore
          );

        case 'oldest':
          return (
            new Date(
              a.mod.createdAt,
            ).getTime() -
            new Date(
              b.mod.createdAt,
            ).getTime()
          );

        case 'newest':
        default:
          return (
            new Date(
              b.mod.createdAt,
            ).getTime() -
            new Date(
              a.mod.createdAt,
            ).getTime()
          );
      }
    },
  );

  const hasFilters =
    searchQuery ||
    selectedCategory ||
    selectedGame ||
    selectedTag ||
    selectedSort !== 'newest';

  return (
    <section className="mx-auto max-w-7xl px-5 py-12">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-bold uppercase tracking-wider text-amber-400">
            Khám phá nội dung
          </p>

          <h1 className="mt-2 text-4xl font-black">
            Thư viện mod
          </h1>

          <p className="mt-2 text-slate-400">
            Tìm có dấu, không dấu, sai chính tả nhẹ, theo game, tác giả và tag.
          </p>
        </div>

        <Link
          href="/discover"
          className="rounded-xl border border-amber-400/20 bg-amber-400/10 px-4 py-2 font-semibold text-amber-200"
        >
          Khám phá nổi bật
        </Link>
      </div>

      <div className="mt-8">
        <SmartSearchBar
          initialQuery={searchQuery}
        />
      </div>

      <form
        action="/mods"
        method="get"
        className="mt-4 grid gap-3 md:grid-cols-4"
      >
        {searchQuery && (
          <input
            type="hidden"
            name="q"
            value={searchQuery}
          />
        )}

        <select
          name="game"
          defaultValue={selectedGame}
        >
          <option value="">
            Tất cả game
          </option>
          {games.map((game) => (
            <option key={game} value={game}>
              {game}
            </option>
          ))}
        </select>

        <select
          name="category"
          defaultValue={selectedCategory}
        >
          <option value="">
            Tất cả danh mục
          </option>
          {categories.map((category) => (
            <option
              key={category}
              value={category}
            >
              {category}
            </option>
          ))}
        </select>

        <select
          name="sort"
          defaultValue={
            searchQuery &&
            selectedSort === 'newest'
              ? 'relevance'
              : selectedSort
          }
        >
          {searchQuery && (
            <option value="relevance">
              Liên quan nhất
            </option>
          )}
          <option value="newest">
            Mới nhất
          </option>
          <option value="trending">
            Đang thịnh hành
          </option>
          <option value="favorites">
            Tâm đắc nhiều nhất
          </option>
          <option value="rating">
            Luận đạo cao nhất
          </option>
          <option value="review-count">
            Nhiều lượt luận đạo
          </option>
          <option value="downloads">
            Nhiều lượt tải nhất
          </option>
          <option value="oldest">
            Cũ nhất
          </option>
        </select>

        <button
          type="submit"
          className="rounded-xl bg-amber-400 px-5 py-3 font-bold text-slate-950 hover:bg-amber-300"
        >
          Áp dụng
        </button>
      </form>

      {tags.length > 0 && (
        <div className="mt-5 flex flex-wrap gap-2">
          {tags.slice(0, 24).map((tag) => (
            <TagBadge
              key={tag}
              tag={tag}
              active={tag === selectedTag}
            />
          ))}
        </div>
      )}

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-500">
          Tìm thấy{' '}
          <strong className="text-slate-300">
            {sortedMods.length}
          </strong>{' '}
          mod phù hợp.
        </p>

        {hasFilters && (
          <Link
            href="/mods"
            className="text-sm font-semibold text-amber-300 hover:text-amber-200"
          >
            Xóa bộ lọc
          </Link>
        )}
      </div>

      {sortedMods.length > 0 ? (
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {sortedMods.map((item) => (
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
      ) : (
        <div className="mt-12 rounded-2xl border border-dashed border-white/10 px-5 py-16 text-center">
          <p className="text-lg font-bold text-slate-300">
            Không tìm thấy bí tịch phù hợp
          </p>
          <p className="mt-2 text-sm text-slate-500">
            Hãy thử từ khóa ngắn hơn, đổi tag hoặc bỏ bớt bộ lọc.
          </p>
        </div>
      )}
    </section>
  );
}
