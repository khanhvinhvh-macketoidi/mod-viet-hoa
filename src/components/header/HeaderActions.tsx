import Link from 'next/link';
import NotificationBell from '@/components/notifications/NotificationBell';
import ThemeSwitcher from '@/components/theme/ThemeSwitcher';
import UserDropdown from '@/components/header/UserDropdown';

type UserRole = 'MEMBER' | 'MODDER' | 'ADMIN';

type HeaderUser = {
  name: string;
  role: UserRole;
  isVip: boolean;
};

type HeaderActionsProps = {
  user: HeaderUser | null;
};

export default function HeaderActions({ user }: HeaderActionsProps) {
  return (
    <div className="flex items-center gap-1 sm:gap-2">
      {user && (
        <div className="grid min-h-10 place-items-center rounded-xl transition hover:bg-[#36d7ff]/[.06]">
          <NotificationBell />
        </div>
      )}

      <ThemeSwitcher />

      {user ? (
        <UserDropdown user={user} />
      ) : (
        <>
          <Link href="/login" className="iv2-nav-link hidden sm:inline-flex">
            Đăng nhập
          </Link>
          <Link
            href="/register"
            className="iv2-button iv2-button-primary min-h-10 px-3.5 py-2 text-sm"
          >
            Đăng ký
          </Link>
        </>
      )}
    </div>
  );
}
