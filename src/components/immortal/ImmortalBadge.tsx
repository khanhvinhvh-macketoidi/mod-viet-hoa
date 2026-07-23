import type { ReactNode } from 'react';

type Tone = 'cyan' | 'jade' | 'violet' | 'gold' | 'danger';

export default function ImmortalBadge({
  children,
  tone = 'cyan',
  icon,
  className = '',
}: {
  children: ReactNode;
  tone?: Tone;
  icon?: ReactNode;
  className?: string;
}) {
  return (
    <span className={`im-badge im-badge-${tone} ${className}`}>
      {icon}
      {children}
    </span>
  );
}
