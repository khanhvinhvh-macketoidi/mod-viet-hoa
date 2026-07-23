import type { HTMLAttributes, ReactNode } from 'react';

export default function ImmortalCard({
  children,
  elevated = false,
  interactive = false,
  className = '',
  ...props
}: HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
  elevated?: boolean;
  interactive?: boolean;
}) {
  return (
    <div
      className={[
        elevated ? 'im-glass im-glass-elevated' : 'im-glass',
        interactive ? 'im-glass-interactive' : '',
        className,
      ].join(' ')}
      {...props}
    >
      {children}
    </div>
  );
}
