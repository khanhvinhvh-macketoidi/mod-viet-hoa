import type { ReactNode } from 'react';
import { Inbox } from 'lucide-react';
import { cn } from '@/lib/cn';

export function Spinner({ className, label = 'Đang tải' }: { className?: string; label?: string }) {
  return <span role="status" aria-label={label} className={cn('ui-spinner', className)} />;
}

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden="true" className={cn('ui-skeleton', className)} />;
}

export function EmptyState({
  title,
  description,
  action,
  icon,
  className,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  icon?: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn('ui-empty-state', className)}>
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-slate-400">
        {icon || <Inbox className="h-7 w-7" />}
      </div>
      <h2 className="mt-4 text-lg font-black text-white">{title}</h2>
      {description ? <p className="mt-2 max-w-lg text-sm leading-6 text-slate-400">{description}</p> : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </section>
  );
}
