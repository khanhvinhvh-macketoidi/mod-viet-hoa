import Link from 'next/link';
import {
  Copyright,
  FileText,
  Flag,
  Mail,
  ShieldCheck,
} from 'lucide-react';
import {
  PUBLIC_BETA_LABEL,
  PUBLIC_SITE_NAME,
} from '@/lib/public/site-public-info';

const links = [
  { href: '/terms', label: 'Điều khoản', icon: FileText },
  { href: '/privacy', label: 'Quyền riêng tư', icon: ShieldCheck },
  { href: '/community-guidelines', label: 'Quy định cộng đồng', icon: Flag },
  { href: '/copyright', label: 'Bản quyền', icon: Copyright },
  { href: '/contact', label: 'Liên hệ', icon: Mail },
];

export default function PublicFooterLinks() {
  return (
    <section
      className="public-legal-bar"
      aria-label="Thông tin pháp lý và hỗ trợ"
    >
      <div className="iv2-container public-legal-bar__inner">
        <p>
          <strong>{PUBLIC_SITE_NAME}</strong>
          <span>{PUBLIC_BETA_LABEL}</span>
        </p>

        <nav aria-label="Liên kết pháp lý">
          {links.map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href}>
              <Icon size={13} aria-hidden="true" />
              {label}
            </Link>
          ))}
        </nav>
      </div>
    </section>
  );
}
