import Link from 'next/link';
import type {
  AnchorHTMLAttributes,
  ButtonHTMLAttributes,
  HTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
} from 'react';

export function IV2Card({
  children,
  interactive = false,
  strong = false,
  className = '',
  ...props
}: HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
  interactive?: boolean;
  strong?: boolean;
}) {
  return (
    <div
      className={[
        'iv2-glass',
        strong ? 'iv2-glass-strong' : '',
        interactive ? 'iv2-interactive' : '',
        className,
      ].join(' ')}
      {...props}
    >
      {children}
    </div>
  );
}

export function IV2Button({
  children,
  secondary = false,
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  secondary?: boolean;
}) {
  return (
    <button
      className={`iv2-button ${secondary ? 'iv2-button-secondary' : 'iv2-button-primary'} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function IV2ButtonLink({
  href,
  children,
  secondary = false,
  className = '',
  ...props
}: AnchorHTMLAttributes<HTMLAnchorElement> & {
  href: string;
  secondary?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`iv2-button ${secondary ? 'iv2-button-secondary' : 'iv2-button-primary'} ${className}`}
      {...props}
    >
      {children}
    </Link>
  );
}

export function IV2Badge({
  children,
  tone = 'cyan',
  className = '',
}: {
  children: ReactNode;
  tone?: 'cyan' | 'jade' | 'violet' | 'gold' | 'danger';
  className?: string;
}) {
  return <span className={`iv2-badge iv2-badge-${tone} ${className}`}>{children}</span>;
}

export function IV2Input({
  className = '',
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={`iv2-input ${className}`} {...props} />;
}
