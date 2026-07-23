import Link from 'next/link';
import { BookOpenText, ScrollText, Upload } from 'lucide-react';

type UserRole = 'MEMBER' | 'MODDER' | 'ADMIN';

type HeaderNavProps = {
  role?: UserRole;
};

export default function HeaderNav({ role }: HeaderNavProps) {
  const canUpload = role === 'MODDER' || role === 'ADMIN';

  return (
    <nav aria-label="Điều hướng chính" className="flex items-center gap-1 sm:gap-2">
      <Link href="/mods" className="iv2-nav-link">
        <BookOpenText size={16} />
        <span className="hidden md:inline">Thư viện</span>
      </Link>

      <Link href="/thien-co-cac" className="iv2-nav-link hidden lg:inline-flex">
        <ScrollText size={16} />
        <span>Thiên Cơ Các</span>
      </Link>

      {canUpload && (
        <Link href="/mods/upload" className="iv2-nav-link">
          <Upload size={16} />
          <span className="hidden lg:inline">Đăng mod</span>
        </Link>
      )}
    </nav>
  );
}
