import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

type BadgeVariant = 'neutral' | 'brand' | 'info' | 'success' | 'warning' | 'danger' | 'vip';

const styles: Record<BadgeVariant, string> = {
  neutral: 'border-white/10 bg-white/6 text-slate-300',
  brand: 'border-brand-300/25 bg-brand-400/12 text-brand-200',
  info: 'border-sky-300/25 bg-sky-400/12 text-sky-200',
  success: 'border-emerald-300/25 bg-emerald-400/12 text-emerald-200',
  warning: 'border-orange-300/25 bg-orange-400/12 text-orange-200',
  danger: 'border-red-300/25 bg-red-400/12 text-red-200',
  vip: 'border-amber-300/35 bg-gradient-to-r from-amber-400/18 to-yellow-300/10 text-amber-200',
};

export function Badge({
  className,
  variant = 'neutral',
  ...props
}: HTMLAttributes<HTMLSpanElement> & { variant?: BadgeVariant }) {
  return (
    <span
      className={cn('inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-bold', styles[variant], className)}
      {...props}
    />
  );
}
