import Link from 'next/link';
import type { ModItem } from '@/lib/types';
import {
  Download,
  Heart,
  LockKeyhole,
  MessageCircle,
  Sparkles,
  Star,
  UserRound,
} from 'lucide-react';

type Props = {
  mod: ModItem;
  ratingAverage?: number;
  ratingCount?: number;
  commentCount?: number;
  favoriteCount?: number;
};

function formatDownloads(value: number) {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return String(value);
}

export default function ModCard({
  mod,
  ratingAverage = 0,
  ratingCount = 0,
  commentCount = 0,
  favoriteCount = 0,
}: Props) {
  const x = mod.coverPositionX ?? 50;
  const y = mod.coverPositionY ?? 50;

  const access =
    mod.accessLevel === 'VIP'
      ? { label: 'VIP', tone: 'gold' }
      : mod.accessLevel === 'MEMBER'
        ? { label: 'Thành viên', tone: 'violet' }
        : { label: 'Công khai', tone: 'jade' };

  return (
    <Link href={`/mods/${mod.slug}`} className="iv2-glass iv2-interactive group flex h-full flex-col overflow-hidden">
      <div className="relative aspect-[16/9] overflow-hidden bg-[#030712]">
        {mod.coverUrl ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={mod.coverUrl}
              alt={mod.title}
              className="h-full w-full object-cover transition duration-700 group-hover:scale-[1.055]"
              style={{ objectPosition: `${x}% ${y}%` }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#071424] via-transparent to-black/10" />
          </>
        ) : (
          <div className="h-full w-full bg-[radial-gradient(circle_at_25%_20%,rgba(54,215,255,.28),transparent_35%),linear-gradient(135deg,#0d2740,#17163d_62%,#030712)]" />
        )}

        <div className="absolute left-3 top-3">
          <span className="iv2-badge iv2-badge-cyan bg-[#030712]/72 backdrop-blur-md">
            {mod.game}
          </span>
        </div>

        <div className="absolute right-3 top-3">
          <span className={`iv2-badge iv2-badge-${access.tone}`}>
            {mod.accessLevel !== 'PUBLIC' && <LockKeyhole className="h-3 w-3" />}
            {access.label}
          </span>
        </div>
      </div>

      <div className="flex flex-1 flex-col p-[18px]">
        <div className="flex items-start gap-2">
          {mod.accessLevel === 'VIP' && (
            <Sparkles className="mt-1 h-4 w-4 shrink-0 text-[#e7c66f]" />
          )}
          <h2 className="iv2-display line-clamp-2 min-h-[3.25rem] text-[17px] font-black transition group-hover:text-[#74e8ff]">
            {mod.title}
          </h2>
        </div>

        <p className="mt-2 line-clamp-2 min-h-10 text-sm leading-5 text-[#839caf]">
          {mod.description}
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          <span className="iv2-badge iv2-badge-jade">{mod.category}</span>
          <span className="iv2-badge iv2-badge-violet">v{mod.version}</span>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="iv2-badge iv2-badge-cyan">
            <Star className="h-3.5 w-3.5 fill-current" />
            {ratingCount > 0 ? ratingAverage.toFixed(1) : 'Mới'}
          </span>
          <span className="iv2-badge">
            <MessageCircle className="h-3.5 w-3.5" />
            {commentCount}
          </span>
          <span className="iv2-badge iv2-badge-danger">
            <Heart className="h-3.5 w-3.5" />
            {favoriteCount}
          </span>
        </div>

        <div className="mt-auto flex items-center justify-between gap-3 border-t border-[#36d7ff]/10 pt-3 text-xs text-[#647c90]">
          <div className="flex min-w-0 items-center gap-1.5">
            <UserRound className="h-3.5 w-3.5 shrink-0 text-[#36d7ff]" />
            <span className="truncate">{mod.author}</span>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <Download className="h-3.5 w-3.5" />
            <span>{formatDownloads(mod.downloads)}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}
