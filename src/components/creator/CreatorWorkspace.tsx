'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import {
  BarChart3,
  Boxes,
  CalendarClock,
  ChevronDown,
  Download,
  Edit3,
  Eye,
  FilePlus2,
  Grid2X2,
  Heart,
  Layers3,
  List,
  MessageCircle,
  PackagePlus,
  Search,
  SlidersHorizontal,
  Star,
  Upload,
} from 'lucide-react';

import type { CreatorWorkspaceData, CreatorWorkspaceMod } from '@/lib/creator-workspace';

type SortMode = 'UPDATED' | 'DOWNLOADS' | 'RATING' | 'NEWEST' | 'TITLE';
type ViewMode = 'GRID' | 'LIST';

function formatNumber(value: number): string {
  return new Intl.NumberFormat('vi-VN', { notation: 'compact', maximumFractionDigits: 1 }).format(value);
}

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Chưa rõ';
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
}

function accessLabel(value: CreatorWorkspaceMod['accessLevel']): string {
  if (value === 'VIP') return 'VIP';
  if (value === 'MEMBER') return 'Thành viên';
  return 'Công khai';
}

function EmptyState({ hasFilters }: { hasFilters: boolean }) {
  return (
    <div className="rounded-3xl border border-dashed border-white/15 bg-slate-900/40 px-6 py-16 text-center">
      <Boxes className="mx-auto h-10 w-10 text-slate-600" />
      <h2 className="mt-4 text-xl font-black">
        {hasFilters ? 'Không tìm thấy bí tịch phù hợp' : 'Đạo hữu chưa đăng mod nào'}
      </h2>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-400">
        {hasFilters
          ? 'Hãy thử đổi từ khóa hoặc bỏ bớt bộ lọc.'
          : 'Đăng mod đầu tiên để bắt đầu quản lý nội dung trong Tông Sư Các.'}
      </p>
      {!hasFilters && (
        <Link
          href="/mods/upload"
          className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-amber-400 px-5 py-3 font-black text-slate-950 transition hover:bg-amber-300"
        >
          <Upload className="h-4 w-4" />
          Đăng mod đầu tiên
        </Link>
      )}
    </div>
  );
}

function ModCard({ mod, viewMode }: { mod: CreatorWorkspaceMod; viewMode: ViewMode }) {
  const listMode = viewMode === 'LIST';

  return (
    <article
      className={`group overflow-hidden rounded-3xl border border-white/10 bg-slate-900/75 shadow-xl shadow-black/10 transition hover:-translate-y-0.5 hover:border-amber-400/25 ${
        listMode ? 'grid md:grid-cols-[220px_1fr]' : ''
      }`}
    >
      <Link href={`/mods/${mod.slug}`} className="relative block overflow-hidden bg-slate-950">
        <img
          src={mod.coverUrl || '/images/mod-placeholder.jpg'}
          alt={mod.title}
          className={`w-full object-cover transition duration-500 group-hover:scale-[1.03] ${
            listMode ? 'h-52 md:h-full md:min-h-[250px]' : 'aspect-[16/9]'
          }`}
        />
        <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-slate-950 to-transparent" />
        <div className="absolute bottom-3 left-3 flex flex-wrap gap-2">
          <span className="rounded-full border border-white/10 bg-slate-950/85 px-2.5 py-1 text-[11px] font-black text-white backdrop-blur">
            {mod.game}
          </span>
          <span className="rounded-full border border-amber-300/20 bg-amber-400/15 px-2.5 py-1 text-[11px] font-black text-amber-200 backdrop-blur">
            {accessLabel(mod.accessLevel)}
          </span>
        </div>
      </Link>

      <div className="flex min-w-0 flex-col p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-amber-400">
              {mod.category}
            </p>
            <Link href={`/mods/${mod.slug}`} className="mt-2 block">
              <h2 className="truncate text-xl font-black text-white transition hover:text-amber-300">
                {mod.title}
              </h2>
            </Link>
          </div>
          <span className="shrink-0 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-black text-slate-300">
            v{mod.version}
          </span>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <div className="rounded-2xl bg-white/[0.04] px-3 py-2.5">
            <div className="flex items-center gap-1.5 text-xs text-slate-500"><Download className="h-3.5 w-3.5" /> Lượt tải</div>
            <p className="mt-1 font-black">{formatNumber(mod.downloads)}</p>
          </div>
          <div className="rounded-2xl bg-white/[0.04] px-3 py-2.5">
            <div className="flex items-center gap-1.5 text-xs text-slate-500"><Star className="h-3.5 w-3.5" /> Luận đạo</div>
            <p className="mt-1 font-black">{mod.averageRating > 0 ? mod.averageRating.toFixed(1) : '—'}</p>
          </div>
          <div className="rounded-2xl bg-white/[0.04] px-3 py-2.5">
            <div className="flex items-center gap-1.5 text-xs text-slate-500"><MessageCircle className="h-3.5 w-3.5" /> Luận bàn</div>
            <p className="mt-1 font-black">{formatNumber(mod.commentCount)}</p>
          </div>
          <div className="rounded-2xl bg-white/[0.04] px-3 py-2.5">
            <div className="flex items-center gap-1.5 text-xs text-slate-500"><Layers3 className="h-3.5 w-3.5" /> Bản phát hành</div>
            <p className="mt-1 font-black">{mod.releaseCount}</p>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-500">
          <span>Game: {mod.gameVersion}</span>
          <span className="flex items-center gap-1"><Heart className="h-3.5 w-3.5" /> {mod.favoriteCount}</span>
          <span className="flex items-center gap-1"><CalendarClock className="h-3.5 w-3.5" /> {formatDate(mod.updatedAt)}</span>
        </div>

        <div className="mt-auto grid grid-cols-2 gap-2 pt-5 sm:grid-cols-4">
          <Link href={`/mods/${mod.slug}`} className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm font-bold text-slate-200 transition hover:bg-white/10">
            <Eye className="h-4 w-4" /> Xem
          </Link>
          <Link href={`/admin/mods/${mod.id}/edit`} className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm font-bold text-slate-200 transition hover:bg-white/10">
            <Edit3 className="h-4 w-4" /> Chỉnh sửa
          </Link>
          <Link href={`/admin/mods/${mod.id}/edit#release`} className="inline-flex items-center justify-center gap-2 rounded-xl border border-amber-400/20 bg-amber-400/10 px-3 py-2.5 text-sm font-bold text-amber-300 transition hover:bg-amber-400/15">
            <PackagePlus className="h-4 w-4" /> Phát hành
          </Link>
          <Link href={`/creator/analytics?mod=${encodeURIComponent(mod.id)}`} className="inline-flex items-center justify-center gap-2 rounded-xl border border-sky-400/20 bg-sky-400/10 px-3 py-2.5 text-sm font-bold text-sky-300 transition hover:bg-sky-400/15">
            <BarChart3 className="h-4 w-4" /> Phân tích
          </Link>
        </div>
      </div>
    </article>
  );
}

export default function CreatorWorkspace({ data }: { data: CreatorWorkspaceData }) {
  const [query, setQuery] = useState('');
  const [game, setGame] = useState('ALL');
  const [category, setCategory] = useState('ALL');
  const [access, setAccess] = useState('ALL');
  const [sort, setSort] = useState<SortMode>('UPDATED');
  const [viewMode, setViewMode] = useState<ViewMode>('GRID');

  const filteredMods = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase('vi');
    const result = data.mods.filter((mod) => {
      const matchesQuery =
        !normalizedQuery ||
        [mod.title, mod.game, mod.category, mod.version, mod.gameVersion]
          .join(' ')
          .toLocaleLowerCase('vi')
          .includes(normalizedQuery);
      return (
        matchesQuery &&
        (game === 'ALL' || mod.game === game) &&
        (category === 'ALL' || mod.category === category) &&
        (access === 'ALL' || mod.accessLevel === access)
      );
    });

    return result.sort((a, b) => {
      if (sort === 'DOWNLOADS') return b.downloads - a.downloads;
      if (sort === 'RATING') return b.averageRating - a.averageRating;
      if (sort === 'NEWEST') return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      if (sort === 'TITLE') return a.title.localeCompare(b.title, 'vi');
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });
  }, [access, category, data.mods, game, query, sort]);

  const hasFilters = Boolean(query.trim()) || game !== 'ALL' || category !== 'ALL' || access !== 'ALL';

  return (
    <div className="space-y-6">
      <header className="overflow-hidden rounded-3xl border border-white/10 bg-[radial-gradient(circle_at_top_right,rgba(251,191,36,0.16),transparent_42%),linear-gradient(135deg,rgba(15,23,42,0.96),rgba(2,6,23,0.98))] p-6 sm:p-8">
        <div className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-end">
          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-[0.24em] text-amber-400">Tông Sư Các</p>
            <h1 className="mt-3 break-words text-3xl font-black leading-tight sm:text-4xl">
              Mod của {data.creatorName}
            </h1>
            <p className="mt-3 max-w-2xl text-slate-400">Quản lý metadata, phát hành phiên bản mới và theo dõi hiệu suất của toàn bộ mod tại một nơi.</p>
          </div>
          <div className="grid w-full gap-3 sm:grid-cols-2 xl:w-auto xl:min-w-[390px]">
            <Link href="/mods/upload" className="inline-flex min-h-12 items-center justify-center gap-2 whitespace-nowrap rounded-2xl bg-amber-400 px-5 py-3 font-black text-slate-950 transition hover:bg-amber-300">
              <FilePlus2 className="h-4 w-4 shrink-0" />
              <span>Đăng mod mới</span>
            </Link>
            <Link href="/creator/analytics" className="inline-flex min-h-12 items-center justify-center gap-2 whitespace-nowrap rounded-2xl border border-white/10 bg-white/5 px-5 py-3 font-black text-white transition hover:bg-white/10">
              <BarChart3 className="h-4 w-4 shrink-0" />
              <span>Xem phân tích</span>
            </Link>
          </div>
        </div>

        <div className="mt-7 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[
            ['Tổng mod', data.summary.totalMods.toLocaleString('vi-VN')],
            ['Lượt tải', formatNumber(data.summary.totalDownloads)],
            ['Luận đạo', formatNumber(data.summary.totalReviews)],
            ['Luận bàn', formatNumber(data.summary.totalComments)],
          ].map(([label, value]) => (
            <div key={label} className="rounded-2xl border border-white/10 bg-slate-950/45 px-4 py-4 backdrop-blur">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">{label}</p>
              <p className="mt-2 text-2xl font-black">{value}</p>
            </div>
          ))}
        </div>
      </header>

      <section className="min-w-0 rounded-3xl border border-white/10 bg-slate-900/65 p-4 sm:p-5">
        <div className="grid min-w-0 gap-3">
          <div className="flex h-12 min-w-0 items-center rounded-2xl border border-white/10 bg-slate-950/70 px-4 transition focus-within:border-amber-400/40">
            <Search
              className="mr-3 h-4 w-4 shrink-0 text-slate-500"
              aria-hidden="true"
            />
            <input
              type="search"
              aria-label="Tìm kiếm mod"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Tìm tên mod, game, phiên bản..."
              className="h-full min-w-0 flex-1 !rounded-none !border-0 !bg-transparent !p-0 text-sm !shadow-none !outline-none !ring-0 placeholder:text-slate-600 focus:!border-0 focus:!shadow-none focus:!outline-none focus:!ring-0"
              style={{
                appearance: 'none',
                WebkitAppearance: 'none',
                border: '0',
                borderRadius: 0,
                background: 'transparent',
                boxShadow: 'none',
                outline: 'none',
                padding: 0,
                margin: 0,
              }}
            />
          </div>

          <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-[repeat(4,minmax(0,1fr))_auto]">
            <Select value={game} onChange={setGame} ariaLabel="Lọc theo game" options={[['ALL', 'Tất cả game'], ...data.filters.games.map((value) => [value, value] as [string, string])]} />
            <Select value={category} onChange={setCategory} ariaLabel="Lọc theo danh mục" options={[['ALL', 'Tất cả danh mục'], ...data.filters.categories.map((value) => [value, value] as [string, string])]} />
            <Select value={access} onChange={setAccess} ariaLabel="Lọc quyền truy cập" options={[[ 'ALL', 'Mọi quyền' ], [ 'PUBLIC', 'Công khai' ], [ 'MEMBER', 'Thành viên' ], [ 'VIP', 'VIP' ]]} />
            <Select value={sort} onChange={(value) => setSort(value as SortMode)} ariaLabel="Sắp xếp" options={[[ 'UPDATED', 'Mới cập nhật' ], [ 'DOWNLOADS', 'Nhiều lượt tải' ], [ 'RATING', 'Luận đạo cao' ], [ 'NEWEST', 'Mới đăng' ], [ 'TITLE', 'Tên A–Z' ]]} />
            <div className="flex h-12 w-full justify-self-stretch rounded-2xl border border-white/10 bg-slate-950/70 p-1 sm:col-span-2 xl:col-span-1 xl:w-auto xl:justify-self-end">
              <button type="button" onClick={() => setViewMode('GRID')} aria-label="Dạng lưới" className={`grid min-w-12 flex-1 place-items-center rounded-xl transition xl:flex-none ${viewMode === 'GRID' ? 'bg-white/10 text-amber-300' : 'text-slate-500 hover:text-white'}`}><Grid2X2 className="h-4 w-4" /></button>
              <button type="button" onClick={() => setViewMode('LIST')} aria-label="Dạng danh sách" className={`grid min-w-12 flex-1 place-items-center rounded-xl transition xl:flex-none ${viewMode === 'LIST' ? 'bg-white/10 text-amber-300' : 'text-slate-500 hover:text-white'}`}><List className="h-4 w-4" /></button>
            </div>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm">
          <p className="text-slate-400"><span className="font-black text-white">{filteredMods.length}</span> / {data.mods.length} mod</p>
          {hasFilters && (
            <button type="button" onClick={() => { setQuery(''); setGame('ALL'); setCategory('ALL'); setAccess('ALL'); }} className="inline-flex items-center gap-2 font-bold text-amber-300 hover:text-amber-200">
              <SlidersHorizontal className="h-4 w-4" /> Xóa bộ lọc
            </button>
          )}
        </div>
      </section>

      {filteredMods.length === 0 ? (
        <EmptyState hasFilters={hasFilters} />
      ) : (
        <section className={viewMode === 'GRID' ? 'grid gap-5 2xl:grid-cols-2' : 'grid gap-5'}>
          {filteredMods.map((mod) => <ModCard key={mod.id} mod={mod} viewMode={viewMode} />)}
        </section>
      )}
    </div>
  );
}

function Select({ value, onChange, options, ariaLabel }: { value: string; onChange: (value: string) => void; options: Array<[string, string]>; ariaLabel: string }) {
  return (
    <label className="relative block min-w-0">
      <select aria-label={ariaLabel} value={value} onChange={(event) => onChange(event.target.value)} className="h-12 w-full min-w-0 appearance-none rounded-2xl border border-white/10 bg-slate-950/70 px-4 pr-10 text-sm font-bold outline-none transition focus:border-amber-400/40">
        {options.map(([optionValue, label]) => <option key={optionValue} value={optionValue}>{label}</option>)}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
    </label>
  );
}
