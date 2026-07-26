import Link from 'next/link';
import { Heart, Sparkles } from 'lucide-react';

export default function SupportBanner() {
  return (
    <aside className="iv2-support-banner" aria-label="Ủng hộ hệ thống">
      <div className="iv2-container iv2-support-banner-inner">
        <span className="iv2-support-banner-icon" aria-hidden="true">
          <Heart size={16} />
        </span>
        <p>
          Cùng duy trì Thư viện MOD và tiếp sức cho những bản Việt hóa chất
          lượng hơn.
        </p>
        <Link href="/support">
          <Sparkles size={15} aria-hidden="true" />
          Ủng hộ hệ thống
        </Link>
      </div>
    </aside>
  );
}
