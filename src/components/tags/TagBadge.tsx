import Link from 'next/link';
import { Tag } from 'lucide-react';

export default function TagBadge({
  tag,
  active = false,
}: {
  tag: string;
  active?: boolean;
}) {
  return (
    <Link
      href={`/mods?tag=${encodeURIComponent(tag)}`}
      className={
        active
          ? 'inline-flex items-center gap-1.5 rounded-full border border-amber-400/40 bg-amber-400/15 px-3 py-1 text-xs font-semibold text-amber-200'
          : 'inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-400 hover:border-amber-400/30 hover:text-amber-200'
      }
    >
      <Tag className="h-3.5 w-3.5" />
      {tag}
    </Link>
  );
}
