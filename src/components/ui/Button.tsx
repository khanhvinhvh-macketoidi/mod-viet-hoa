import Link from 'next/link';
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/cn';

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success';
type ButtonSize = 'sm' | 'md' | 'lg' | 'icon';

type CommonProps = {
  children: ReactNode;
  className?: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
};

type ButtonProps = CommonProps & ButtonHTMLAttributes<HTMLButtonElement>;
type ButtonLinkProps = CommonProps & { href: string; ariaLabel?: string };

const variantClasses: Record<ButtonVariant, string> = {
  primary: 'bg-brand-400 text-slate-950 shadow-sm hover:bg-brand-300 focus-visible:ring-brand-300',
  secondary: 'bg-slate-800 text-slate-100 hover:bg-slate-700 focus-visible:ring-slate-500',
  outline: 'border border-white/15 bg-transparent text-slate-100 hover:border-brand-400/60 hover:bg-brand-400/10 focus-visible:ring-brand-300',
  ghost: 'bg-transparent text-slate-300 hover:bg-white/7 hover:text-white focus-visible:ring-slate-500',
  danger: 'bg-red-500 text-white hover:bg-red-400 focus-visible:ring-red-300',
  success: 'bg-emerald-500 text-slate-950 hover:bg-emerald-400 focus-visible:ring-emerald-300',
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'min-h-9 rounded-lg px-3 text-sm',
  md: 'min-h-11 rounded-xl px-4 text-sm',
  lg: 'min-h-12 rounded-xl px-5 text-base',
  icon: 'h-10 w-10 rounded-xl p-0',
};

function buttonClasses(variant: ButtonVariant, size: ButtonSize, className?: string) {
  return cn(
    'inline-flex shrink-0 items-center justify-center gap-2 font-bold transition duration-200',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950',
    'disabled:pointer-events-none disabled:opacity-50',
    variantClasses[variant],
    sizeClasses[size],
    className,
  );
}

export function Button({
  children,
  className,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      className={buttonClasses(variant, size, className)}
      disabled={disabled || isLoading}
      aria-busy={isLoading || undefined}
      {...props}
    >
      {isLoading ? <span className="ui-spinner" aria-hidden="true" /> : null}
      {children}
    </button>
  );
}

export function ButtonLink({
  href,
  children,
  className,
  variant = 'primary',
  size = 'md',
  ariaLabel,
}: ButtonLinkProps) {
  return (
    <Link href={href} aria-label={ariaLabel} className={buttonClasses(variant, size, className)}>
      {children}
    </Link>
  );
}
