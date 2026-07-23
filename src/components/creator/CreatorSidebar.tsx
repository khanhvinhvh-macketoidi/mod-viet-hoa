'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  BarChart3,
  Bell,
  Boxes,
  Gauge,
  HeartHandshake,
  Settings,
  Upload,
} from 'lucide-react';

const items = [
  { href: '/creator', label: 'Tổng quan', icon: Gauge, exact: true },
  { href: '/creator/mods', label: 'Mod của tôi', icon: Boxes },
  { href: '/creator/analytics', label: 'Phân tích', icon: BarChart3 },
  { href: '/creator/followers', label: 'Đồng đạo', icon: HeartHandshake },
  { href: '/creator/notifications', label: 'Truyền âm', icon: Bell },
  { href: '/creator/settings', label: 'Thiết lập', icon: Settings },
];

export default function CreatorSidebar() {
  const pathname = usePathname();

  return (
    <aside className="rounded-3xl border border-white/10 bg-slate-950/70 p-4 shadow-2xl shadow-black/20 backdrop-blur-xl lg:sticky lg:top-6 lg:h-fit">
      <div className="px-3 py-3">
        <p className="text-xs font-black uppercase tracking-[0.24em] text-amber-400">Creator Studio</p>
        <p className="mt-2 text-sm text-slate-400">Quản lý nội dung và hiệu suất mod.</p>
      </div>

      <Link href="/admin/mods/new" className="mt-3 flex min-h-12 items-center justify-center gap-2 whitespace-nowrap rounded-2xl bg-amber-400 px-4 py-3 font-black text-slate-950 transition hover:bg-amber-300">
        <Upload className="h-4 w-4 shrink-0" /> <span>Đăng mod mới</span>
      </Link>

      <nav className="mt-5 grid gap-1.5">
        {items.map(({ href, label, icon: Icon, exact }) => {
          const active = exact ? pathname === href : pathname.startsWith(href);
          return (
            <Link key={href} href={href} className={`flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-bold transition ${active ? 'border border-amber-400/20 bg-amber-400/10 text-amber-300' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}>
              <Icon className="h-4 w-4" /> {label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
