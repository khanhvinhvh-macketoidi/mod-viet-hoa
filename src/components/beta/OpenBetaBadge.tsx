import Link from 'next/link';
import { SITE_INFO } from '@/config/site';

type OpenBetaBadgeProps = {
  className?: string;
};

export default function OpenBetaBadge({ className = '' }: OpenBetaBadgeProps) {
  return (
    <Link
      href="/beta"
      title={`${SITE_INFO.name} hiện đang trong giai đoạn ${SITE_INFO.stage}.`}
      aria-label={`Xem thông tin ${SITE_INFO.stage}`}
      className={`inline-flex shrink-0 items-center rounded-full border border-[#e7c66f]/35 bg-[#e7c66f]/10 px-2 py-1 text-[9px] font-black tracking-[0.12em] text-[#f2db93] shadow-[0_0_18px_rgba(231,198,111,0.08)] transition hover:border-[#e7c66f]/60 hover:bg-[#e7c66f]/15 hover:text-white ${className}`}
    >
      {SITE_INFO.stageLabel}
    </Link>
  );
}
