import Link from 'next/link';
import type {
  AnchorHTMLAttributes,
  ButtonHTMLAttributes,
  ReactNode,
} from 'react';

type Variant = 'primary' | 'secondary' | 'vip';

const variants: Record<Variant, string> = {
  primary: 'im-btn-primary',
  secondary: 'im-btn-secondary',
  vip: 'im-btn-vip',
};

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  icon?: ReactNode;
};

export function ImmortalButton({
  variant = 'primary',
  icon,
  className = '',
  children,
  ...props
}: ButtonProps) {
  return (
    <button className={`im-btn ${variants[variant]} ${className}`} {...props}>
      {icon}
      {children}
    </button>
  );
}

type LinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  href: string;
  variant?: Variant;
  icon?: ReactNode;
};

export function ImmortalButtonLink({
  href,
  variant = 'primary',
  icon,
  className = '',
  children,
  ...props
}: LinkProps) {
  return (
    <Link href={href} className={`im-btn ${variants[variant]} ${className}`} {...props}>
      {icon}
      {children}
    </Link>
  );
}
