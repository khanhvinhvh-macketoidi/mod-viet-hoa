import Link from 'next/link';
import { getCurrentUser } from '@/lib/auth';
import {
  BookOpenText,
  LogOut,
  Shield,
  Sparkles,
  LayoutDashboard,
  ScrollText,
  Upload,
  UserRound,
} from 'lucide-react';
import NotificationBell from '@/components/notifications/NotificationBell';
import ThemeSwitcher from '@/components/theme/ThemeSwitcher';
import OpenBetaBadge from '@/components/beta/OpenBetaBadge';

export default async function Header() {
  const user = await getCurrentUser();

  return (
    <header className="iv2-header">
      <div className="iv2-container flex min-h-[72px] items-center justify-between gap-3">
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
          <OpenBetaBadge className="hidden sm:inline-flex" />
        </div>

        <nav className="flex items-center gap-1 sm:gap-2">
          <Link href="/mods" className="iv2-nav-link">
            <BookOpenText size={16} />
            <span className="hidden md:inline">Thư viện</span>
          </Link>

          <Link href="/thien-co-cac" className="iv2-nav-link hidden xl:inline-flex">
            <ScrollText size={16} />
            Thiên Cơ Các
          </Link>

          {(user?.role === 'MODDER' || user?.role === 'ADMIN') && (
            <>
              <Link href="/mods/upload" className="iv2-nav-link">
                <Upload size={16} />
                <span className="hidden lg:inline">Đăng mod</span>
              </Link>
              <Link href="/creator" className="iv2-nav-link hidden xl:inline-flex">
                <LayoutDashboard size={16} />
                Creator Center
              </Link>
              {user.role === 'ADMIN' && (
                <Link href="/admin/mods" className="iv2-nav-link hidden 2xl:inline-flex">
                  Quản trị
                </Link>
              )}
            </>
          )}

          <ThemeSwitcher />

          {user ? (
            <>
              <div className="grid min-h-10 place-items-center rounded-xl transition hover:bg-[#36d7ff]/[.06]">
                <NotificationBell />
              </div>

              <Link
                href="/profile"
                className="hidden max-w-44 items-center gap-2 rounded-xl border border-[#36d7ff]/12 bg-[#081526]/60 px-3 py-2 text-sm text-[#b5cad9] transition hover:border-[#36d7ff]/30 hover:bg-[#36d7ff]/[.06] hover:text-white sm:flex"
              >
                <UserRound size={15} className="shrink-0 text-[#36d7ff]" />
                <span className="truncate">{user.name}</span>
                {user.isVip && (
                  <span className="rounded-full border border-[#e7c66f]/30 bg-[#e7c66f]/10 px-1.5 py-0.5 text-[9px] font-black text-[#f2db93]">
                    VIP
                  </span>
                )}
              </Link>

              {user.role === 'ADMIN' && (
                <span className="hidden h-9 w-9 place-items-center rounded-xl border border-[#8f70ff]/20 bg-[#8f70ff]/10 text-[#c2b5ff] sm:grid">
                  <Shield size={15} />
                </span>
              )}

              <form action="/api/auth/logout" method="post">
                <button
                  type="submit"
                  className="inline-flex min-h-10 items-center gap-1.5 rounded-xl px-3 text-[#90a9bc] transition hover:bg-[#ff6f89]/10 hover:text-[#ff9eb0]"
                >
                  <LogOut size={15} />
                  <span className="hidden lg:inline">Thoát</span>
                </button>
              </form>
            </>
          ) : (
            <>
              <Link href="/login" className="iv2-nav-link hidden sm:inline-flex">
                Đăng nhập
              </Link>
              <Link href="/register" className="iv2-button iv2-button-primary min-h-10 px-3.5 py-2 text-sm">
                Đăng ký
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
