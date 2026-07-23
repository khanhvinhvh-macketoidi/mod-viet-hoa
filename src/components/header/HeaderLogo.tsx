import Link from 'next/link';
import { Sparkles } from 'lucide-react';
import OpenBetaBadge from '@/components/beta/OpenBetaBadge';

export default function HeaderLogo() {
  return (
    <div className="flex min-w-0 items-center gap-2">
      <Link href="/" className="group flex min-w-0 items-center gap-3">
        <span className="iv2-logo transition group-hover:scale-[1.04] group-hover:border-[#36d7ff]/50">
          <Sparkles size={19} />
        </span>

        <span className="min-w-0">
          <span className="block truncate text-[15px] font-black tracking-[0.14em] text-white">
            THƯ VIỆN <span className="iv2-gradient-text">MOD</span>
          </span>
          <span className="hidden text-[10px] font-bold tracking-[0.14em] text-[#667f92] sm:block">
            HỆ THỐNG TU LUYỆN VIỆT HÓA
          </span>
        </span>
      </Link>

      <OpenBetaBadge className="hidden xl:inline-flex" />
    </div>
  );
}
