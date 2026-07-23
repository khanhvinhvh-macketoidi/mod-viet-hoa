import type { ReactNode } from 'react';

type Props = {
  eyebrow?: string;
  title: ReactNode;
  description?: ReactNode;
  level?: 1 | 2 | 3;
  size?: 'xl' | 'lg' | 'md';
  align?: 'left' | 'center';
  className?: string;
};

export default function XianxiaHeading({
  eyebrow, title, description, level = 2, size = 'lg', align = 'left', className = '',
}: Props) {
  const Tag = `h${level}` as const;
  return (
    <div className={['space-y-3', align === 'center' ? 'text-center' : '', className].join(' ')}>
      {eyebrow && <div className={['xianxia-eyebrow', align === 'center' ? 'justify-center' : ''].join(' ')}>{eyebrow}</div>}
      <Tag className={`xianxia-title xianxia-title--${size}`}>{title}</Tag>
      {description && <div className={['xianxia-subtitle max-w-3xl', align === 'center' ? 'mx-auto' : ''].join(' ')}>{description}</div>}
    </div>
  );
}
