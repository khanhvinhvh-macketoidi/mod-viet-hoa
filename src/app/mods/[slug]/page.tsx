import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import {
  calculateReviewStats,
  getCommentsByModId,
  getModBySlug,
  getMods,
  getReviewsByModId,
  getUsers,
} from '@/lib/store';
import { getCurrentUser } from '@/lib/auth';
import ModCard from '@/components/ModCard';
import ModMediaShowcase from '@/components/ModMediaShowcase';
import CommentForm from '@/components/CommentForm';
import CommentThread from '@/components/comments/CommentThread';
import { getReactionSummaryMap } from '@/lib/comment-reactions';
import {
  CalendarDays,
  ChevronRight,
  Download,
  FileArchive,
  Home,
  LockKeyhole,
  UserRound,
} from 'lucide-react';
import ReviewCard from '@/components/ReviewCard';
import ReviewForm from '@/components/ReviewForm';
import ReviewSummary from '@/components/ReviewSummary';
import StarRatingDisplay from '@/components/StarRatingDisplay';
import FavoriteButton from '@/components/FavoriteButton';
import CollectionPicker from '@/components/collections/CollectionPicker';
import {
  getFavoriteCountForMod,
  getFavoriteCountMap,
  isModFavoritedByUser,
} from '@/lib/favorites';
import { getRelatedMods } from '@/lib/recommendations';
import TagBadge from '@/components/tags/TagBadge';
import {
  getCollectionsByOwnerId,
  getCollectionsContainingModForUser,
} from '@/lib/collections';
import {
  ensureCurrentVersion,
  getVersionsByModId,
} from '@/lib/mod-versions';
import { getDependenciesByModId } from '@/lib/mod-dependencies';
import VersionHistory from '@/components/versions/VersionHistory';
import ModDependencies from '@/components/dependencies/ModDependencies';
import { absoluteUrl, compactDescription, safeJsonLd } from '@/lib/seo';

type ModDetailProps = {
  params: Promise<{
    slug: string;
  }>;

  searchParams: Promise<{
  commentSuccess?: string;
  commentDeleted?: string;
  commentError?: string;

  reviewSuccess?: string;
  reviewDeleted?: string;
  reviewError?: string;
}>;
};


export async function generateMetadata({
  params,
}: Pick<ModDetailProps, 'params'>): Promise<Metadata> {
  const { slug } = await params;
  const mod = await getModBySlug(slug);

  if (!mod) {
    return {
      title: 'Không tìm thấy bí tịch',
      robots: { index: false, follow: false },
    };
  }

  const description = compactDescription(mod.description);
  const canonical = `/mods/${encodeURIComponent(mod.slug)}`;
  const cover = absoluteUrl(mod.coverUrl);

  return {
    title: mod.title,
    description,
    alternates: { canonical },
    openGraph: {
      type: 'article',
      url: canonical,
      title: mod.title,
      description,
      images: [{ url: cover, alt: mod.title }],
    },
    twitter: {
      card: 'summary_large_image',
      title: mod.title,
      description,
      images: [cover],
    },
  };
}

function formatFileSize(bytes: number): string {
  const megabytes = bytes / 1024 / 1024;

  if (megabytes >= 1024) {
    return `${(megabytes / 1024).toFixed(2)} GB`;
  }

  return `${megabytes.toFixed(2)} MB`;
}

function getAccessLabel(
  accessLevel: 'PUBLIC' | 'MEMBER' | 'VIP',
): string {
  switch (accessLevel) {
    case 'VIP':
      return 'VIP';
    case 'MEMBER':
      return 'Thành viên';
    default:
      return 'Công khai';
  }
}

function getAccessIcon(
  accessLevel: 'PUBLIC' | 'MEMBER' | 'VIP',
): string {
  switch (accessLevel) {
    case 'VIP':
      return '👑';
    case 'MEMBER':
      return '🔐';
    default:
      return '🔓';
  }
}

export default async function ModDetail({
  params,
  searchParams,
}: ModDetailProps) {
  const { slug } = await params;
  const mod = await getModBySlug(slug);

  if (!mod) {
    notFound();
  }

  const [
  allMods,
  user,
  comments,
  reviews,
  users,
  query,
] = await Promise.all([
  getMods(),
  getCurrentUser(),
  getCommentsByModId(mod.id),
  getReviewsByModId(mod.id),
  getUsers(),
  searchParams,
]);

await ensureCurrentVersion(
  mod,
  mod.authorId,
);

const [
  versions,
  dependencies,
] = await Promise.all([
  getVersionsByModId(mod.id),
  getDependenciesByModId(mod.id),
]);

const reviewStats =
  calculateReviewStats(reviews);

const currentUserReview = user
  ? reviews.find(
      (review) =>
        review.userId === user.id,
    )
  : undefined;

const adminUserIds = new Set(
  users
    .filter(
      (item) => item.role === 'ADMIN',
    )
    .map((item) => item.id),
);

const reactionSummaries =
  await getReactionSummaryMap(
    comments.map((comment) => comment.id),
    user?.id,
  );

const mentionCandidates = users
  .filter((item) => item.isActive !== false)
  .map((item) => ({
    id: item.id,
    label:
      item.profile?.displayName?.trim() ||
      item.name,
    username: item.name,
    profileSlug: item.profileSlug,
  }));

const [
  favoriteCount,
  isFavorited,
  userCollections,
  selectedCollectionIds,
  favoriteCountMap,
] = await Promise.all([
  getFavoriteCountForMod(mod.id),
  user
    ? isModFavoritedByUser(mod.id, user.id)
    : Promise.resolve(false),
  user
    ? getCollectionsByOwnerId(user.id)
    : Promise.resolve([]),
  user
    ? getCollectionsContainingModForUser(
        mod.id,
        user.id,
      )
    : Promise.resolve([]),
  getFavoriteCountMap(),
]);
  const recommendationSignals =
    Object.fromEntries(
      allMods.map((item) => {
        const stats =
          item.id === mod.id
            ? {
                favoriteCount,
                ratingAverage:
                  reviewStats.average,
                ratingCount:
                  reviewStats.count,
              }
            : {
                favoriteCount:
                  favoriteCountMap[
                    item.id
                  ] ?? 0,
              };

        return [item.id, stats];
      }),
    );

  const relatedMods = getRelatedMods(
    mod,
    allMods,
    recommendationSignals,
    3,
  );

  const allowed =
    mod.accessLevel === 'PUBLIC' ||
    (mod.accessLevel === 'MEMBER' && Boolean(user)) ||
    (mod.accessLevel === 'VIP' && Boolean(user?.isVip)) ||
    user?.role === 'ADMIN';

  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: mod.title,
    description: compactDescription(mod.description, 500),
    url: absoluteUrl(`/mods/${mod.slug}`),
    image: absoluteUrl(mod.coverUrl),
    applicationCategory: 'GameApplication',
    operatingSystem: 'Windows',
    softwareVersion: mod.version,
    author: { '@type': 'Person', name: mod.author },
    datePublished: mod.createdAt,
    dateModified: mod.updatedAt || mod.createdAt,
    downloadUrl: absoluteUrl(`/api/mods/${mod.id}/download`),
    interactionStatistic: {
      '@type': 'InteractionCounter',
      interactionType: 'https://schema.org/DownloadAction',
      userInteractionCount: mod.downloads,
    },
    aggregateRating:
      reviewStats.count > 0
        ? {
            '@type': 'AggregateRating',
            ratingValue: reviewStats.average,
            reviewCount: reviewStats.count,
            bestRating: 5,
            worstRating: 1,
          }
        : undefined,
  };

  const breadcrumbData = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Trang chủ', item: absoluteUrl('/') },
      { '@type': 'ListItem', position: 2, name: 'Thư viện mod', item: absoluteUrl('/mods') },
      { '@type': 'ListItem', position: 3, name: mod.title, item: absoluteUrl(`/mods/${mod.slug}`) },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(structuredData) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(breadcrumbData) }} />
      <section className="mx-auto max-w-6xl px-5 py-12">
      <nav aria-label="Breadcrumb" className="mb-6">
        <ol className="flex flex-wrap items-center gap-2 text-sm text-slate-400">
          <li>
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 transition hover:text-amber-300"
            >
              <Home className="h-4 w-4" />
              Trang chủ
            </Link>
          </li>

          <li aria-hidden="true">
            <ChevronRight className="h-4 w-4 text-slate-600" />
          </li>

          <li>
            <Link
              href="/mods"
              className="transition hover:text-amber-300"
            >
              Thư viện mod
            </Link>
          </li>

          <li aria-hidden="true">
            <ChevronRight className="h-4 w-4 text-slate-600" />
          </li>

          <li>
            <Link
              href={`/mods?game=${encodeURIComponent(mod.game)}`}
              className="max-w-52 truncate transition hover:text-amber-300"
              title={mod.game}
            >
              {mod.game}
            </Link>
          </li>

          <li aria-hidden="true">
            <ChevronRight className="h-4 w-4 text-slate-600" />
          </li>

          <li
            className="max-w-full truncate font-semibold text-slate-200"
            aria-current="page"
            title={mod.title}
          >
            {mod.title}
          </li>
        </ol>
      </nav>

      <div className="overflow-hidden rounded-3xl border border-white/10 bg-slate-900">
        <div className="p-3">
          <ModMediaShowcase
            coverUrl={mod.coverUrl}
            galleryUrls={mod.galleryUrls ?? []}
            modTitle={mod.title}
            game={mod.game}
            category={mod.category}
            accessLabel={getAccessLabel(mod.accessLevel)}
            accessIcon={getAccessIcon(mod.accessLevel)}
            coverPositionX={mod.coverPositionX}
            coverPositionY={mod.coverPositionY}
          />
        </div>
        <div className="flex flex-wrap gap-x-6 gap-y-3 border-t border-white/10 px-6 py-4 text-sm text-slate-400">
          <span className="flex items-center gap-2">
            <UserRound className="h-4 w-4" />
            Tác giả: {mod.author}
          </span>

          <span>Mod v{mod.version}</span>
          <span>Game {mod.gameVersion}</span>

<span className="flex items-center gap-2">
  <StarRatingDisplay
    value={reviewStats.average}
    size="sm"
  />

  <span>
    {reviewStats.count > 0
      ? `${reviewStats.average.toFixed(1)} (${reviewStats.count})`
      : 'Chưa có đánh giá'}
  </span>
</span>

          <span className="flex items-center gap-2">
            <Download className="h-4 w-4" />
            {mod.downloads} lượt tu luyện
          </span>

          <span className="flex items-center gap-2">
            ❤️ {favoriteCount} người tâm đắc
          </span>

          <span className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4" />
            {new Date(mod.createdAt).toLocaleDateString('vi-VN')}
          </span>
        </div>

        {mod.tags && mod.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 border-t border-white/10 px-6 py-4">
            {mod.tags.map((tag) => (
              <TagBadge key={tag} tag={tag} />
            ))}
          </div>
        )}
      </div>

      <div className="mt-8 grid gap-8 md:grid-cols-[1fr_320px]">
        <article className="space-y-8">
          <section className="rounded-2xl border border-white/10 bg-slate-900 p-6">
            <h2 className="text-xl font-bold">Giới thiệu bí thuật</h2>

            <p className="mt-4 whitespace-pre-line leading-7 text-slate-300">
              {mod.description}
            </p>
          </section>

          <section className="rounded-2xl border border-white/10 bg-slate-900 p-6">
            <h2 className="text-xl font-bold">Hướng dẫn giải cấm</h2>

            <p className="mt-4 whitespace-pre-line leading-7 text-slate-300">
              {mod.installation}
            </p>
          </section>

          <ModDependencies
            dependencies={dependencies}
            modsById={
              new Map(
                allMods.map((item) => [
                  item.id,
                  item,
                ]),
              )
            }
          />

          <VersionHistory
            modId={mod.id}
            versions={versions}
            allowed={allowed}
          />
        </article>

        <aside className="h-fit rounded-2xl border border-white/10 bg-slate-900 p-5 md:sticky md:top-24">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-400/10 text-amber-400">
              <FileArchive className="h-6 w-6" />
            </div>

            <div>
              <p className="text-sm text-slate-400">Tệp tải xuống</p>
              <p className="text-sm font-bold text-slate-100">
                Phiên bản {mod.version}
              </p>
            </div>
          </div>

          <p className="mt-4 break-all font-semibold text-slate-200">
            {mod.fileName}
          </p>

          <div className="mt-3 grid grid-cols-2 gap-3 rounded-xl bg-slate-950/60 p-3 text-sm">
            <div>
              <p className="text-xs text-slate-500">Dung lượng</p>
              <p className="mt-1 font-semibold text-slate-200">
                {formatFileSize(mod.fileSize)}
              </p>
            </div>

            <div>
              <p className="text-xs text-slate-500">Lượt tu luyện</p>
              <p className="mt-1 font-semibold text-slate-200">
                {mod.downloads}
              </p>
            </div>
          </div>

          {allowed ? (
            <a
              href={`/api/download/${mod.id}`}
              className="mt-6 flex items-center justify-center gap-3 rounded-2xl bg-amber-400 px-4 py-4 text-lg font-bold text-slate-950 transition hover:scale-[1.02] hover:bg-amber-300"
            >
              <Download className="h-5 w-5" />
              Tu luyện
            </a>
          ) : (
            <div className="mt-6 rounded-xl border border-amber-400/20 bg-amber-400/5 p-4 text-sm text-slate-300">
              <LockKeyhole className="mb-3 h-6 w-6 text-amber-400" />

              <p className="font-semibold text-slate-100">
                Chưa đủ tu vi tiếp cận
              </p>

              <p className="mt-2 leading-6">
                Nội dung này yêu cầu{' '}
                {mod.accessLevel === 'VIP'
                  ? 'tài khoản VIP'
                  : 'đăng nhập thành viên'}
                .
              </p>
            </div>
          )}

          {(user?.role === 'ADMIN' ||
            user?.id === mod.authorId) && (
            <div className="mt-4 grid gap-2">
              <Link
                href={`/admin/mods/${mod.id}/releases`}
                className="flex items-center justify-center rounded-xl border border-amber-400/20 bg-amber-400/10 px-4 py-2 text-sm font-semibold text-amber-200 hover:bg-amber-400/15"
              >
                Quản lý phiên bản
              </Link>

              <Link
                href={`/admin/mods/${mod.id}/tags`}
                className="flex items-center justify-center rounded-xl border border-white/10 px-4 py-2 text-sm font-semibold text-slate-300 hover:bg-white/5"
              >
                Quản lý từ khóa
              </Link>
            </div>
          )}

          <div className="mt-4 grid gap-3">
            <FavoriteButton
              modId={mod.id}
              initialFavorited={isFavorited}
              initialCount={favoriteCount}
              isLoggedIn={Boolean(user)}
            />

            <CollectionPicker
              modId={mod.id}
              collections={userCollections.map(
                (collection) => ({
                  id: collection.id,
                  title: collection.title,
                  visibility:
                    collection.visibility,
                }),
              )}
              initialCollectionIds={
                selectedCollectionIds
              }
              isLoggedIn={Boolean(user)}
            />
          </div>
        </aside>
      </div>

<section
  id="reviews"
  className="mt-12 scroll-mt-24 rounded-3xl border border-white/10 bg-slate-900 p-5 md:p-7"
>
  <div>
    <p className="text-sm font-bold uppercase tracking-wider text-amber-400">
      Chất lượng bí thuật
    </p>

    <h2 className="mt-2 text-3xl font-black">
      Giám định và đánh giá
    </h2>

    <p className="mt-2 text-sm text-slate-400">
      Mỗi đạo hữu chỉ có một lượt giám định cho mỗi bí thuật
      và có thể cập nhật bất cứ lúc nào.
    </p>
  </div>

  {query.reviewSuccess && (
    <div className="mt-5 rounded-xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
      Kết quả giám định đã được ghi nhận.
    </div>
  )}

  {query.reviewDeleted && (
    <div className="mt-5 rounded-xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
      Kết quả giám định đã được xóa.
    </div>
  )}

  {query.reviewError === 'rating' && (
    <div className="mt-5 rounded-xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
      Vui lòng chọn từ 1 đến 5 sao.
    </div>
  )}

  {query.reviewError === 'too-long' && (
    <div className="mt-5 rounded-xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
      Nội dung đánh giá không được vượt quá
      2.000 ký tự.
    </div>
  )}

  {query.reviewError === 'too-fast' && (
    <div className="mt-5 rounded-xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
      Đạo hữu thao tác quá nhanh. Hãy chờ vài giây
      rồi thử lại.
    </div>
  )}

  <div className="mt-6">
    <ReviewSummary
      average={reviewStats.average}
      count={reviewStats.count}
      distribution={reviewStats.distribution}
    />
  </div>

  <div className="mt-6">
    <ReviewForm
      modId={mod.id}
      modSlug={mod.slug}
      isLoggedIn={Boolean(user)}
      userName={
        user?.name ||
        user?.email
      }
      existingReview={currentUserReview}
    />
  </div>

  <div className="mt-8 space-y-4">
    {reviews.map((review) => (
      <ReviewCard
        key={review.id}
        review={review}
        canDelete={
          user?.role === 'ADMIN' ||
          user?.id === review.userId
        }
        isAdminReview={adminUserIds.has(
          review.userId,
        )}
      />
    ))}

    {reviews.length === 0 && (
      <div className="rounded-2xl border border-dashed border-white/10 px-5 py-12 text-center">
        <p className="font-semibold text-slate-300">
          Chưa có đánh giá
        </p>

        <p className="mt-2 text-sm text-slate-500">
          Hãy là người đầu tiên giám định bí thuật này.
        </p>
      </div>
    )}
  </div>
</section>

<section
  id="comments"
  className="
    mt-12 scroll-mt-24
    rounded-3xl border border-white/10
    bg-slate-900 p-5 md:p-7
  "
>
  <div
    className="
      flex flex-col gap-3
      sm:flex-row sm:items-end
      sm:justify-between
    "
  >
    <div>
      <p
        className="
          text-sm font-bold uppercase
          tracking-wider text-amber-400
        "
      >
        Cộng đồng
      </p>

      <h2 className="mt-2 text-3xl font-black">
        Luận bàn
      </h2>

      <p className="mt-2 text-sm text-slate-400">
        {comments.length === 0
          ? 'Chưa có ai luận bàn.'
          : `${comments.length} lời luận bàn về bản mod này.`}
      </p>
    </div>
  </div>

  {query.commentSuccess && (
    <div
      className="
        mt-5 rounded-xl
        border border-emerald-400/20
        bg-emerald-500/10
        px-4 py-3 text-sm
        text-emerald-200
      "
    >
      Luận bàn đã được ghi nhận.
    </div>
  )}

  {query.commentDeleted && (
    <div
      className="
        mt-5 rounded-xl
        border border-emerald-400/20
        bg-emerald-500/10
        px-4 py-3 text-sm
        text-emerald-200
      "
    >
      Đã xóa luận bàn của đạo hữu.
    </div>
  )}

  {query.commentError === 'empty' && (
    <div
      className="
        mt-5 rounded-xl
        border border-red-400/20
        bg-red-500/10
        px-4 py-3 text-sm
        text-red-200
      "
    >
      Nội dung luận bàn không được để trống.
    </div>
  )}

  {query.commentError === 'too-long' && (
    <div
      className="
        mt-5 rounded-xl
        border border-red-400/20
        bg-red-500/10
        px-4 py-3 text-sm
        text-red-200
      "
    >
      Lời luận bàn không được vượt quá 1.000 ký tự.
    </div>
  )}

  {query.commentError === 'locked' && (
    <div className="mt-5 rounded-xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
      Chủ đề luận bàn này đã bị khóa và không thể nhận thêm phản hồi.
    </div>
  )}

  {query.commentError === 'invalid-parent' && (
    <div className="mt-5 rounded-xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
      Lời luận bàn trước đó không tồn tại hoặc không thuộc về bí thuật này.
    </div>
  )}

  {query.commentError === 'too-fast' && (
    <div
      className="
        mt-5 rounded-xl
        border border-red-400/20
        bg-red-500/10
        px-4 py-3 text-sm
        text-red-200
      "
    >
      Đạo hữu đang gửi luận bàn quá nhanh.
      Hãy chờ khoảng 10 giây rồi thử lại.
    </div>
  )}

  <div className="mt-6">
    <CommentForm
      modId={mod.id}
      modSlug={mod.slug}
      isLoggedIn={Boolean(user)}
      userName={
        user?.name ||
        user?.email
      }
    />
  </div>

  <div className="mt-8">
    <CommentThread
      comments={comments}
      modId={mod.id}
      modSlug={mod.slug}
      isLoggedIn={Boolean(user)}
      currentUserId={user?.id}
      isAdmin={user?.role === 'ADMIN'}
      adminUserIds={Array.from(adminUserIds)}
      reactionSummaries={reactionSummaries}
      mentionCandidates={mentionCandidates}
    />
  </div>
</section>
      {relatedMods.length > 0 && (
        <section className="mt-16 border-t border-white/10 pt-12">
          <h2 className="text-3xl font-black">
            Đạo hữu cũng có thể quan tâm
          </h2>

          <p className="mt-2 text-slate-400">
            Các bí thuật cùng pháp môn hoặc cùng danh mục.
          </p>

          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {relatedMods.map((item) => (
              <ModCard key={item.id} mod={item} favoriteCount={favoriteCountMap[item.id] ?? 0} />
            ))}
          </div>
        </section>
      )}

      <style>{`
        .comment-focus-highlight {
          border-color: rgba(251, 191, 36, 0.9) !important;
          box-shadow:
            0 0 0 3px rgba(251, 191, 36, 0.16),
            0 18px 55px rgba(245, 158, 11, 0.12) !important;
          background:
            linear-gradient(
              135deg,
              rgba(120, 53, 15, 0.22),
              rgba(15, 23, 42, 0.76)
            ) !important;
          transform: translateY(-2px);
        }
      `}</style>
      </section>
    </>
  );
}