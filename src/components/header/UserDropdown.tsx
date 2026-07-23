'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  ChevronDown,
  CircleUserRound,
  LayoutDashboard,
  LogOut,
  Settings,
  Shield,
} from 'lucide-react';

type UserRole = 'MEMBER' | 'MODDER' | 'ADMIN';

type UserDropdownProps = {
  user: {
    name: string;
    role: UserRole;
    isVip: boolean;
  };
};

const ROLE_LABELS: Record<UserRole, string> = {
  MEMBER: 'Tán Tu',
  MODDER: 'Tông Sư',
  ADMIN: 'Giới Đế',
};

export default function UserDropdown({ user }: UserDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const canAccessCreator = user.role === 'MODDER' || user.role === 'ADMIN';

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target instanceof Node ? event.target : null)) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((current) => !current)}
        className="flex min-h-10 max-w-44 items-center gap-2 rounded-xl border border-[#36d7ff]/12 bg-[#081526]/60 px-2.5 py-2 text-sm text-[#b5cad9] transition hover:border-[#36d7ff]/30 hover:bg-[#36d7ff]/[.06] hover:text-white sm:px-3"
      >
        <CircleUserRound size={16} className="shrink-0 text-[#36d7ff]" />
        <span className="hidden truncate sm:inline">{user.name}</span>
        {user.isVip && (
          <span className="hidden rounded-full border border-[#e7c66f]/30 bg-[#e7c66f]/10 px-1.5 py-0.5 text-[9px] font-black text-[#f2db93] lg:inline">
            VIP
          </span>
        )}
        <ChevronDown
          size={14}
          className={`shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {isOpen && (
        <div
          role="menu"
          className="absolute right-0 top-[calc(100%+10px)] z-50 w-[min(290px,calc(100vw-24px))] overflow-hidden rounded-2xl border border-[#36d7ff]/15 bg-[#071321]/[0.98] p-2 shadow-[0_24px_70px_rgba(0,0,0,0.5)] backdrop-blur-xl"
        >
          <div className="border-b border-[#36d7ff]/10 px-3 py-3">
            <p className="truncate font-black text-white">{user.name}</p>
            <div className="mt-1 flex items-center gap-2 text-xs text-[#8097aa]">
              <span>{ROLE_LABELS[user.role]}</span>
              {user.isVip && <span className="text-[#e7c66f]">• VIP</span>}
            </div>
          </div>

          <div className="py-2">
            <DropdownLink href="/profile" icon={<CircleUserRound size={16} />}>
              Đạo Tịch
            </DropdownLink>

            {canAccessCreator && (
              <DropdownLink href="/creator" icon={<LayoutDashboard size={16} />}>
                Tông Sư Các
              </DropdownLink>
            )}

            <DropdownLink href="/profile/edit" icon={<Settings size={16} />}>
              Thiết lập Đạo Tịch
            </DropdownLink>
          </div>

          {user.role === 'ADMIN' && (
            <div className="border-t border-[#36d7ff]/10 py-2">
              <DropdownLink href="/admin/mods" icon={<Shield size={16} />}>
                Quản trị Tiên Môn
              </DropdownLink>
            </div>
          )}

          <div className="border-t border-[#36d7ff]/10 pt-2">
            <form action="/api/auth/logout" method="post">
              <button
                type="submit"
                role="menuitem"
                className="flex min-h-10 w-full items-center gap-3 rounded-xl px-3 text-left text-sm font-semibold text-[#ff9eb0] transition hover:bg-[#ff6f89]/10"
              >
                <LogOut size={16} />
                Thoát
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

type DropdownLinkProps = {
  href: string;
  icon: React.ReactNode;
  children: React.ReactNode;
};

function DropdownLink({ href, icon, children }: DropdownLinkProps) {
  return (
    <Link
      href={href}
      role="menuitem"
      className="flex min-h-10 items-center gap-3 rounded-xl px-3 text-sm font-semibold text-[#b7cad8] transition hover:bg-[#36d7ff]/[.07] hover:text-white"
    >
      <span className="text-[#36d7ff]">{icon}</span>
      <span>{children}</span>
    </Link>
  );
}
