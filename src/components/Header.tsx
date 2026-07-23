import { getCurrentUser } from '@/lib/auth';
import HeaderLogo from '@/components/header/HeaderLogo';
import HeaderNav from '@/components/header/HeaderNav';
import HeaderActions from '@/components/header/HeaderActions';

export default async function Header() {
  const user = await getCurrentUser();

  return (
    <header className="iv2-header">
      <div className="iv2-container flex min-h-[72px] items-center justify-between gap-3">
        <HeaderLogo />
        <div className="flex min-w-0 items-center justify-end gap-1 sm:gap-2">
          <HeaderNav role={user?.role} />
          <HeaderActions user={user} />
        </div>
      </div>
    </header>
  );
}
