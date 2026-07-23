import type { ReactNode } from 'react';

export default function ImmortalIcon({
  children,
  size = 'md',
  className = '',
}: {
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}) {
  const sizes = {
    sm: 'h-9 w-9',
    md: 'h-11 w-11',
    lg: 'h-14 w-14',
  };

  return (
    <span className={`im-icon ${sizes[size]} ${className}`}>
      {children}
    </span>
  );
}
