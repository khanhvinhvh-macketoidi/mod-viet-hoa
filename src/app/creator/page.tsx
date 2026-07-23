import Image from 'next/image';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import {
  Bell,
  Boxes,
  ChevronRight,
  Download,
  FolderHeart,
  HeartHandshake,
  MessageSquare,
  Plus,
  Rocket,
  Star,
} from 'lucide-react';

import CreatorDownloadChart from '@/components/creator/CreatorDownloadChart';
import CreatorStatCard from '@/components/creator/CreatorStatCard';
import { getCurrentUser } from '@/lib/auth';
import {
  getCreatorDashboardData,
  writeCreatorAnalyticsSnapshot,
} from '@/lib/creator-dashboard';

export const dynamic = 'force-dynamic';

function number(value: number): string {
  return new Intl.NumberFormat('vi-VN', { notation: 'compact', maximumFractionDigits: 1 }).format(value);
}

function dateTime(value: string): string {
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

export default async function CreatorDashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  if (user.role !== 'ADMIN' && user.role !== 'MODDER') redirect('/');

  const dashboard = await getCreatorDashboardData(user);
  await writeCreatorAnalyticsSnapshot(user, dashboard);
  const displayName = user.profile?.displayName || user.name;

  const stats = [
    { label: 'Mod đã đăng', value: number(dashboard.stats.mods), helper: 'Nội dung thuộc tài khoản này', icon: Boxes },
    { label: 'Lượt tải', value: number(dashboard.stats.downloads), helper: 'Tổng lượt tải của toàn bộ mod', icon: Download },
    { label: 'Đồng đạo', value: number(dashboard.stats.followers), helper: 'Đồng đạo kết giao với hồ sơ tác giả', icon: HeartHandshake },
    { label: 'Tàng Kinh Các', value: number(dashboard.stats.collections), helper: 'Có chứa ít nhất một mod của đạo hữu', icon: FolderHeart },
    { label: 'Luận đạo', value: dashboard.stats.averageRating ? `${dashboard.stats.averageRating.toFixed(2)}★` : '—', helper: `${number(dashboard.stats.reviews)} lượt luận đạo`, icon: Star },
    { label: 'Luận bàn', value: number(dashboard.stats.comments), helper: 'Luận bàn đang hiển thị', icon: MessageSquare },
  ];

  return (
    <div className="space-y-6">
      <header className="overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-slate-900 via-slate-900 to-amber-950/40 p-6 shadow-2xl shadow-black/20 sm:p-8">
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-center">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.24em] text-amber-400">TÔNG SƯ CÁC</p>
            <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">Xin chào, {displayName}</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400 sm:text-base">
              Theo dõi hiệu suất, hoạt động cộng đồng và quản lý nhanh các bản mod của đạo hữu.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/notifications" className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-bold text-white transition hover:bg-white/10">
              <Bell className="h-4 w-4" />
              {dashboard.stats.unreadNotifications} chưa đọc
            </Link>
            <Link href="/mods/upload" className="inline-flex items-center gap-2 rounded-2xl bg-amber-400 px-4 py-3 text-sm font-black text-slate-950 transition hover:bg-amber-300">
              <Plus className="h-4 w-4" />
              Đăng mod
            </Link>
          </div>
        </div>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {stats.map((item) => <CreatorStatCard key={item.label} {...item} />)}
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.55fr)_minmax(320px,0.85fr)]">
        <article className="rounded-3xl border border-white/10 bg-slate-900/70 p-5 sm:p-6">
          <div className="mb-5 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-black">Tăng trưởng lượt tải</h2>
              <p className="mt-1 text-sm text-slate-500">Snapshot tổng lượt tải theo ngày, tối đa 30 ngày gần nhất.</p>
            </div>
          </div>
          <CreatorDownloadChart snapshots={dashboard.snapshots} />
        </article>

        <article className="rounded-3xl border border-white/10 bg-slate-900/70 p-5 sm:p-6">
          <h2 className="text-xl font-black">Thao tác nhanh</h2>
          <div className="mt-5 grid gap-3">
            <Link href="/mods/upload" className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 p-4 font-bold transition hover:border-amber-300/25 hover:bg-white/10">
              <span className="flex items-center gap-3"><Plus className="h-5 w-5 text-amber-300" />Đăng mod mới</span><ChevronRight className="h-4 w-4 text-slate-600" />
            </Link>
            <Link href="/admin/mods" className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 p-4 font-bold transition hover:border-amber-300/25 hover:bg-white/10">
              <span className="flex items-center gap-3"><Boxes className="h-5 w-5 text-amber-300" />Quản lý mod</span><ChevronRight className="h-4 w-4 text-slate-600" />
            </Link>
            <Link href="/creator/mods" className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 p-4 font-bold transition hover:border-amber-300/25 hover:bg-white/10">
              <span className="flex items-center gap-3"><Rocket className="h-5 w-5 text-amber-300" />Phát hành phiên bản</span><ChevronRight className="h-4 w-4 text-slate-600" />
            </Link>
            <Link href="/profile/collections/new" className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 p-4 font-bold transition hover:border-amber-300/25 hover:bg-white/10">
              <span className="flex items-center gap-3"><FolderHeart className="h-5 w-5 text-amber-300" />Tạo Tàng Kinh Các</span><ChevronRight className="h-4 w-4 text-slate-600" />
            </Link>
          </div>
        </article>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <article className="rounded-3xl border border-white/10 bg-slate-900/70 p-5 sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-black">Mod nổi bật</h2>
              <p className="mt-1 text-sm text-slate-500">Xếp theo tổng lượt tải.</p>
            </div>
            <Link href="/admin/mods" className="text-sm font-bold text-amber-300 hover:text-amber-200">Xem tất cả</Link>
          </div>

          <div className="mt-5 grid gap-3">
            {dashboard.topMods.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-white/10 p-8 text-center text-sm text-slate-500">Chưa có mod nào được gắn với tài khoản này.</p>
            ) : dashboard.topMods.map((mod, index) => (
              <Link key={mod.id} href={`/mods/${mod.slug}`} className="group grid grid-cols-[32px_64px_minmax(0,1fr)_auto] items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-3 transition hover:bg-white/[0.07]">
                <span className="text-center text-sm font-black text-slate-500">{index + 1}</span>
                <div className="relative h-12 overflow-hidden rounded-xl bg-slate-800">
                  {mod.coverUrl ? <Image src={mod.coverUrl} alt="" fill sizes="64px" className="object-cover" /> : null}
                </div>
                <div className="min-w-0">
                  <p className="truncate font-bold group-hover:text-amber-300">{mod.title}</p>
                  <p className="mt-1 text-xs text-slate-500">v{mod.version} · {mod.reviewCount ? `${mod.averageRating.toFixed(1)}★` : 'Chưa có luận đạo'}</p>
                </div>
                <div className="text-right">
                  <p className="font-black">{number(mod.downloads)}</p>
                  <p className="text-xs text-slate-600">lượt tải</p>
                </div>
              </Link>
            ))}
          </div>
        </article>

        <article className="rounded-3xl border border-white/10 bg-slate-900/70 p-5 sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-black">Hoạt động gần đây</h2>
              <p className="mt-1 text-sm text-slate-500">Review, luận bàn, follow và truyền âm.</p>
            </div>
            <Link href="/notifications" className="text-sm font-bold text-amber-300 hover:text-amber-200">Truyền âm</Link>
          </div>

          <div className="mt-5 grid gap-3">
            {dashboard.recentActivities.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-white/10 p-8 text-center text-sm text-slate-500">Chưa có hoạt động cộng đồng.</p>
            ) : dashboard.recentActivities.map((activity) => (
              <Link key={activity.id} href={activity.href} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 transition hover:bg-white/[0.07]">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="font-bold">{activity.title}</p>
                    {activity.rating ? <p className="mt-1 text-sm text-amber-300">{'★'.repeat(Math.max(1, Math.min(5, activity.rating)))}</p> : null}
                    <p className="mt-1 line-clamp-2 text-sm leading-6 text-slate-500">{activity.description}</p>
                  </div>
                  <span className="shrink-0 text-[11px] font-semibold text-slate-600">{dateTime(activity.createdAt)}</span>
                </div>
              </Link>
            ))}
          </div>
        </article>
      </section>
    </div>
  );
}
