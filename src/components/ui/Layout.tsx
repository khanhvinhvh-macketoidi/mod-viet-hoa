import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

export function Container({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8', className)} {...props} />;
}

export function PageHeader({ className, ...props }: HTMLAttributes<HTMLElement>) {
  return <header className={cn('mb-6 flex flex-col gap-2 sm:mb-8', className)} {...props} />;
}

export function Section({ className, ...props }: HTMLAttributes<HTMLElement>) {
  return <section className={cn('py-8 sm:py-10', className)} {...props} />;
}
