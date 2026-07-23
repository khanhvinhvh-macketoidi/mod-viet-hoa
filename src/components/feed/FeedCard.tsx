import Link from 'next/link';
import {
  FolderOpen,
  UserRound,
} from 'lucide-react';
import ModCard from '@/components/ModCard';
import type { FeedEntry } from '@/lib/social-feed';

type Props = {
  entry: FeedEntry;
  favoriteCount: number;
};

function getDisplayName(
  name?: string,
  displayName?: string,
): string {
  return displayName?.trim() || name || 'Tán Tu';
}

export default function FeedCard({
  entry,
  favoriteCount,
}: Props) {
  return (
    <article className="rounded-3xl border border-white/10 bg-slate-900/60 p-4 md:p-5">
      <div className="mb-4 flex flex-wrap items-center gap-2 text-sm text-slate-400">
        {entry.type === 'AUTHOR_MOD' ? (
          <>
            <UserRound className="h-4 w-4 text-sky-300" />
            <span>
              <strong className="text-slate-200">
                {getDisplayName(
                  entry.author?.name,
                  entry.author?.profile
                    ?.displayName,
                )}
              </strong>{' '}
              vừa đăng mod mới
            </span>
          </>
        ) : (
          <>
            <FolderOpen className="h-4 w-4 text-amber-300" />
            <span>
              Mod mới được thêm vào{' '}
              <Link
                href={`/collections/${entry.collection.slug}`}
                className="font-semibold text-amber-200 hover:text-amber-100"
              >
                {entry.collection.title}
              </Link>
            </span>
          </>
        )}

        <span className="ml-auto text-xs text-slate-600">
          {new Date(
            entry.createdAt,
          ).toLocaleString('vi-VN')}
        </span>
      </div>

      <ModCard
        mod={entry.mod}
        favoriteCount={favoriteCount}
      />
    </article>
  );
}
