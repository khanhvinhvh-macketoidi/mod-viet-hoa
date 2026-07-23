import Link from 'next/link';
import {
  BookOpenText,
  CircleHelp,
  Code2,
  MessageCircle,
  ShieldCheck,
  Sparkles,
  Upload,
  Users,
} from 'lucide-react';
import { SITE_NAME } from '@/lib/seo';
import OpenBetaBadge from '@/components/beta/OpenBetaBadge';
import { SITE_INFO } from '@/config/site';

const groups = [
  {
    title: 'Thư viện',
    links: [
      { href: '/mods', label: 'Khám phá mod', icon: BookOpenText },
      { href: '/mods/upload', label: 'Đăng mod', icon: Upload },
    ],
  },
  {
    title: 'Cộng đồng',
    links: [
      { href: '/authors', label: 'Tác giả', icon: Users },
      { href: '/profile', label: 'Hồ sơ', icon: Sparkles },
    ],
  },
  {
    title: 'Hỗ trợ',
    links: [
      { href: '/contact', label: 'Liên hệ', icon: MessageCircle },
      { href: '/thien-co-cac', label: 'Thiên Cơ Các', icon: CircleHelp },
    ],
  },
];

export default function Footer() {
  return (
    <footer className="iv2-footer">
      <div className="iv2-container relative z-10 py-12 sm:py-14">
        <div className="grid gap-10 lg:grid-cols-[1.1fr_1.4fr]">
          <div className="max-w-xl">
            <div className="flex items-center gap-3">
              <span className="iv2-logo">
                <Sparkles size={19} />
              </span>
              <div>
                <p className="font-black tracking-[0.14em] text-white">
                  <span className="iv2-gradient-text">MOD</span> THƯ VIỆN
                </p>
                <p className="mt-1 text-[10px] font-bold tracking-[0.14em] text-[#667f92]">
                  THƯ VIỆN MOD TIÊN HIỆP
                </p>
              </div>
            </div>

            <p className="mt-5 max-w-lg text-sm leading-7 text-[#839caf]">
              Không gian lưu giữ mod, bản Việt hóa và công cụ dành cho cộng đồng
              Quỷ Cốc Bát Hoang tại Việt Nam.
            </p>

            <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-[#4fddb0]/18 bg-[#4fddb0]/[.06] px-3 py-1.5 text-xs font-semibold text-[#a3ead3]">
              <span className="h-2 w-2 rounded-full bg-[#4fddb0] shadow-[0_0_14px_#4fddb0]" />
              Hệ thống đang hoạt động
            </div>
          </div>

          <div className="grid gap-8 sm:grid-cols-3">
            {groups.map((group) => (
              <div key={group.title}>
                <h2 className="text-xs font-black uppercase tracking-[0.16em] text-[#36d7ff]">
                  {group.title}
                </h2>
                <div className="mt-4 grid gap-2">
                  {group.links.map(({ href, label, icon: Icon }) => (
                    <Link
                      key={href}
                      href={href}
                      className="group inline-flex items-center gap-2 rounded-lg py-1.5 text-sm text-[#8da5b7] transition hover:text-[#eafaff]"
                    >
                      <Icon size={14} className="text-[#5c7b91] transition group-hover:text-[#36d7ff]" />
                      {label}
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-4 border-t border-[#36d7ff]/10 pt-6 text-xs text-[#61798b] sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p>© {new Date().getFullYear()} {SITE_NAME}. Dành cho cộng đồng game thủ Việt.</p>
            <p className="mt-2 font-semibold text-[#8da5b7]">{SITE_INFO.gratitude}</p>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <span className="inline-flex items-center gap-1.5">
              <ShieldCheck size={13} /> Giao diện Tiên Hiệp
            </span>
            <OpenBetaBadge />
            <span>v{SITE_INFO.version}</span>
            <span className="inline-flex items-center gap-1.5">
              <Code2 size={13} /> Bản dựng cộng đồng
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
