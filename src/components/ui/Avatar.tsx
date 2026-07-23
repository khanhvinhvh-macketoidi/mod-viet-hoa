import { UserRound } from 'lucide-react';
import { cn } from '@/lib/cn';

type AvatarProps = {
  src?: string | null;
  alt: string;
  fallback?: string;
  className?: string;
};

export function Avatar({ src, alt, fallback, className }: AvatarProps) {
  const initials = fallback || alt.trim().split(/\s+/).slice(-2).map((part) => part[0]?.toUpperCase()).join('');
  return (
    <span className={cn('relative inline-flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/12 bg-slate-800 text-sm font-black text-slate-200', className)}>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={alt} className="h-full w-full object-cover" />
      ) : initials ? (
        <span aria-label={alt}>{initials}</span>
      ) : (
        <UserRound className="h-5 w-5" aria-label={alt} />
      )}
    </span>
  );
}
