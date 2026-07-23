'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import {
  Activity,
  CalendarDays,
  ChevronRight,
  Crown,
  FolderHeart,
  Heart,
  HeartHandshake,
  MessageSquare,
  Search,
  Star,
  UserCheck,
  Users,
  X,
} from 'lucide-react';

import type {
  CreatorFollowerItem,
  CreatorFollowersData,
} from '@/lib/creator-followers';

type SortKey = 'newest' | 'active' | 'reviews' | 'comments' | 'collections';
type FilterKey = 'all' | 'vip' | 'engaged' | 'quiet';

function formatNumber(value: number): string {
  return new Intl.NumberFormat('vi-VN').format(value);
}

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Không rõ';
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
}

function formatRelative(value: string): string {
  const time = new Date(value).getTime();
  if (!Number.isFinite(time)) return 'Không rõ';
  const seconds = Math.max(0, Math.floor((Date.now() - time) / 1000));
  if (seconds < 60) return 'Vừa xong';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} phút trước`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} giờ trước`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} ngày trước`;
  return formatDate(value);
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('') || 'TV';
}

function engagement(item: CreatorFollowerItem): number {
  return (
    item.creatorModFavoriteCount +
    item.creatorModReviewCount +
    item.creatorModCommentCount
  );
}

function Avatar({ follower, size = 'normal' }: { follower: CreatorFollowerItem; size?: 'normal' | 'large' }) {
  const className = size === 'large' ? 'h-20 w-20 text-xl' : 'h-12 w-12 text-sm';
  return (
    <div className={`relative shrink-0 overflow-hidden rounded-2xl border border-white/10 bg-slate-800 ${className}`}>
      {follower.avatar ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={follower.avatar} alt="" className="h-full w-full object-cover" />
      ) : (
        <span className="flex h-full w-full items-center justify-center font-black text-amber-300">
          {initials(follower.name)}
        </span>
      )}
    </div>
  );
}

export default function CreatorFollowersCenter({ data }: { data: CreatorFollowersData }) {
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<SortKey>('newest');
  const [filter, setFilter] = useState<FilterKey>('all');
  const [selected, setSelected] = useState<CreatorFollowerItem | null>(null);

  const followers = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase('vi-VN');
    const result = data.followers.filter((item) => {
      const matchesQuery =
        !normalizedQuery ||
        item.name.toLocaleLowerCase('vi-VN').includes(normalizedQuery) ||
        item.role.toLocaleLowerCase('vi-VN').includes(normalizedQuery);
      const score = engagement(item);
      const matchesFilter =
        filter === 'all' ||
        (filter === 'vip' && item.isVip) ||
        (filter === 'engaged' && score > 0) ||
        (filter === 'quiet' && score === 0);
      return matchesQuery && matchesFilter;
    });

    return result.sort((a, b) => {
      if (sort === 'active') {
        return new Date(b.lastActiveAt).getTime() - new Date(a.lastActiveAt).getTime();
      }
      if (sort === 'reviews') return b.reviewCount - a.reviewCount;
      if (sort === 'comments') return b.commentCount - a.commentCount;
      if (sort === 'collections') return b.collectionCount - a.collectionCount;
      return new Date(b.followedAt).getTime() - new Date(a.followedAt).getTime();
    });
  }, [data.followers, filter, query, sort]);

  const stats = [
    {
      label: 'Đồng đạo',
      value: formatNumber(data.stats.followers),
      helper: `+${formatNumber(data.stats.newThisWeek)} trong 7 ngày`,
      icon: Users,
    },
    {
      label: 'Đã kết giao',
      value: formatNumber(data.stats.following),
      helper: 'Creator và thành viên đạo hữu theo dõi',
      icon: HeartHandshake,
    },
    {
      label: 'Mới hôm nay',
      value: formatNumber(data.stats.newToday),
      helper: 'Follower mới từ 00:00 hôm nay',
      icon: UserCheck,
    },
    {
      label: 'Hoạt động 30 ngày',
      value: `${data.stats.activeRate}%`,
      helper: `${formatNumber(data.stats.activeLast30Days)} follower có hoạt động`,
      icon: Activity,
    },
  ];

  return (
    <div className="space-y-6">
      <header className="overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-slate-900 via-slate-900 to-amber-950/30 p-6 shadow-2xl shadow-black/20 sm:p-8">
        <p className="text-xs font-black uppercase tracking-[0.24em] text-amber-400">
          Creator Community
        </p>
        <div className="mt-3 flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
          <div>
            <h1 className="text-3xl font-black tracking-tight sm:text-4xl">
              Trung tâm đồng đạo
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400 sm:text-base">
              Theo dõi cộng đồng đang quan tâm đến nội dung của đạo hữu và nhận diện những thành viên tương tác tích cực.
            </p>
          </div>
          <Link
            href="/profile"
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-bold transition hover:bg-white/10"
          >
            Xem đạo tịch của tôi
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map(({ label, value, helper, icon: Icon }) => (
          <article key={label} className="rounded-3xl border border-white/10 bg-slate-900/70 p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-400/10 text-amber-300">
                <Icon className="h-5 w-5" />
              </div>
            </div>
            <p className="mt-5 text-xs font-black uppercase tracking-wider text-slate-500">{label}</p>
            <p className="mt-2 text-3xl font-black">{value}</p>
            <p className="mt-2 text-xs leading-5 text-slate-500">{helper}</p>
          </article>
        ))}
      </section>

      <section className="rounded-3xl border border-white/10 bg-slate-900/70 p-4 sm:p-5">
        <div className="grid gap-3 xl:grid-cols-[minmax(240px,1fr)_180px_190px]">
          <div className="flex min-w-0 items-center gap-3 rounded-2xl border border-white/10 bg-slate-950/50 px-4 transition focus-within:border-amber-400/40">
            <Search className="h-4 w-4 shrink-0 text-slate-500" aria-hidden="true" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Tìm theo tên hoặc vai trò..."
              aria-label="Tìm đồng đạo"
              className="min-w-0 flex-1 !rounded-none !border-0 !bg-transparent !px-0 !py-3 text-sm !shadow-none !outline-none !ring-0 placeholder:text-slate-600 focus:!border-0 focus:!shadow-none focus:!outline-none focus:!ring-0"
              style={{ WebkitAppearance: 'none', appearance: 'none' }}
            />
            {query ? (
              <button type="button" onClick={() => setQuery('')} className="shrink-0 text-slate-500 hover:text-white" aria-label="Xóa tìm kiếm">
                <X className="h-4 w-4" />
              </button>
            ) : null}
          </div>

          <select value={filter} onChange={(event) => setFilter(event.target.value as FilterKey)} className="rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-3 text-sm font-bold">
            <option value="all">Tất cả follower</option>
            <option value="vip">Thành viên VIP</option>
            <option value="engaged">Đã tương tác với mod</option>
            <option value="quiet">Chưa tương tác</option>
          </select>

          <select value={sort} onChange={(event) => setSort(event.target.value as SortKey)} className="rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-3 text-sm font-bold">
            <option value="newest">Kết giao mới nhất</option>
            <option value="active">Hoạt động gần đây</option>
            <option value="reviews">Nhiều luận đạo</option>
            <option value="comments">Nhiều luận bàn</option>
            <option value="collections">Nhiều Tàng Kinh Các</option>
          </select>
        </div>
        <p className="mt-3 text-xs font-semibold text-slate-500">
          Hiển thị <span className="text-white">{followers.length}</span> / {data.followers.length} đồng đạo
        </p>
      </section>

      <section className="overflow-hidden rounded-3xl border border-white/10 bg-slate-900/70">
        <div className="hidden grid-cols-[minmax(230px,1.4fr)_130px_120px_110px_40px] gap-4 border-b border-white/10 px-5 py-4 text-[11px] font-black uppercase tracking-wider text-slate-600 lg:grid">
          <span>Thành viên</span>
          <span>Kết giao từ</span>
          <span>Tương tác mod</span>
          <span>Hoạt động</span>
          <span />
        </div>

        {followers.length === 0 ? (
          <div className="p-12 text-center">
            <Users className="mx-auto h-10 w-10 text-slate-700" />
            <h2 className="mt-4 text-lg font-black">Không tìm thấy follower phù hợp</h2>
            <p className="mt-2 text-sm text-slate-500">Thử đổi từ khóa hoặc bộ lọc hiện tại.</p>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {followers.map((follower) => (
              <button
                type="button"
                key={follower.id}
                onClick={() => setSelected(follower)}
                className="grid w-full gap-4 px-5 py-4 text-left transition hover:bg-white/[0.04] lg:grid-cols-[minmax(230px,1.4fr)_130px_120px_110px_40px] lg:items-center"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <Avatar follower={follower} />
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate font-black">{follower.name}</p>
                      {follower.isVip ? <Crown className="h-4 w-4 text-amber-300" /> : null}
                    </div>
                    <p className="mt-1 text-xs font-semibold text-slate-500">{follower.role}</p>
                  </div>
                </div>

                <div>
                  <p className="text-sm font-bold">{formatDate(follower.followedAt)}</p>
                  <p className="mt-1 text-xs text-slate-600">{formatRelative(follower.followedAt)}</p>
                </div>

                <div>
                  <p className="text-sm font-black text-amber-300">{engagement(follower)}</p>
                  <p className="mt-1 text-xs text-slate-600">tâm đắc · review · comment</p>
                </div>

                <div>
                  <p className="text-sm font-bold">{formatRelative(follower.lastActiveAt)}</p>
                  <p className="mt-1 text-xs text-slate-600">gần nhất</p>
                </div>

                <ChevronRight className="hidden h-4 w-4 text-slate-600 lg:block" />
              </button>
            ))}
          </div>
        )}
      </section>

      {selected ? (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/70 backdrop-blur-sm" onMouseDown={() => setSelected(null)}>
          <aside className="h-full w-full max-w-md overflow-y-auto border-l border-white/10 bg-slate-950 p-6 shadow-2xl" onMouseDown={(event) => event.stopPropagation()}>
            <div className="flex justify-end">
              <button type="button" onClick={() => setSelected(null)} className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 text-slate-400 hover:bg-white/5 hover:text-white" aria-label="Đóng">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 flex items-center gap-4">
              <Avatar follower={selected} size="large" />
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h2 className="truncate text-2xl font-black">{selected.name}</h2>
                  {selected.isVip ? <Crown className="h-5 w-5 shrink-0 text-amber-300" /> : null}
                </div>
                <p className="mt-1 text-sm font-bold text-slate-500">{selected.role}</p>
              </div>
            </div>

            <div className="mt-7 grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <CalendarDays className="h-4 w-4 text-amber-300" />
                <p className="mt-3 text-xs font-bold text-slate-500">Kết giao từ</p>
                <p className="mt-1 font-black">{formatDate(selected.followedAt)}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <Activity className="h-4 w-4 text-amber-300" />
                <p className="mt-3 text-xs font-bold text-slate-500">Hoạt động gần nhất</p>
                <p className="mt-1 font-black">{formatRelative(selected.lastActiveAt)}</p>
              </div>
            </div>

            <h3 className="mt-8 text-lg font-black">Hoạt động cộng đồng</h3>
            <div className="mt-4 grid gap-3">
              {[
                { label: 'Luận đạo', value: selected.reviewCount, icon: Star },
                { label: 'Luận bàn', value: selected.commentCount, icon: MessageSquare },
                { label: 'Mod tâm đắc', value: selected.favoriteCount, icon: Heart },
                { label: 'Tàng Kinh Các', value: selected.collectionCount, icon: FolderHeart },
              ].map(({ label, value, icon: Icon }) => (
                <div key={label} className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                  <span className="flex items-center gap-3 text-sm font-bold text-slate-300"><Icon className="h-4 w-4 text-amber-300" />{label}</span>
                  <strong>{formatNumber(value)}</strong>
                </div>
              ))}
            </div>

            <h3 className="mt-8 text-lg font-black">Tương tác với mod của đạo hữu</h3>
            <div className="mt-4 grid grid-cols-3 gap-3 text-center">
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"><Heart className="mx-auto h-4 w-4 text-rose-300" /><p className="mt-2 text-xl font-black">{selected.creatorModFavoriteCount}</p><p className="mt-1 text-[11px] text-slate-500">Tâm đắc</p></div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"><Star className="mx-auto h-4 w-4 text-amber-300" /><p className="mt-2 text-xl font-black">{selected.creatorModReviewCount}</p><p className="mt-1 text-[11px] text-slate-500">Luận đạo</p></div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"><MessageSquare className="mx-auto h-4 w-4 text-sky-300" /><p className="mt-2 text-xl font-black">{selected.creatorModCommentCount}</p><p className="mt-1 text-[11px] text-slate-500">Luận bàn</p></div>
            </div>

            {selected.profileSlug ? (
              <Link href={`/authors/${selected.profileSlug}`} className="mt-8 flex items-center justify-center gap-2 rounded-2xl bg-amber-400 px-4 py-3 font-black text-slate-950 transition hover:bg-amber-300">
                Xem đạo tịch công khai <ChevronRight className="h-4 w-4" />
              </Link>
            ) : null}
          </aside>
        </div>
      ) : null}
    </div>
  );
}
