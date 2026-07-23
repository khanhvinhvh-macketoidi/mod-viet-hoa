import Link from 'next/link';
import {
  Eye,
  EyeOff,
  FolderOpen,
} from 'lucide-react';
import type { ModCollection } from '@/lib/types';

type Props = {
  collection: ModCollection;
  itemCount: number;
};

export default function CollectionCard({
  collection,
  itemCount,
}: Props) {
  return (
    <Link
      href={`/collections/${collection.slug}`}
      className="block rounded-2xl border border-white/10 bg-slate-900 p-5 transition hover:-translate-y-1 hover:border-amber-400/40"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-400/10 text-amber-300">
          <FolderOpen className="h-5 w-5" />
        </div>

        <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-slate-400">
          {collection.visibility === 'PUBLIC' ? (
            <Eye className="h-3.5 w-3.5" />
          ) : (
            <EyeOff className="h-3.5 w-3.5" />
          )}
          {collection.visibility === 'PUBLIC'
            ? 'Công khai'
            : 'Riêng tư'}
        </span>
      </div>

      <h2 className="mt-4 text-xl font-black text-slate-100">
        {collection.title}
      </h2>

      <p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-400">
        {collection.description ||
          'Chưa có mô tả.'}
      </p>

      <p className="mt-4 text-sm font-semibold text-amber-300">
        {itemCount} mod
      </p>
    </Link>
  );
}
