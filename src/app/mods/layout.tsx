import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Thư viện mod',
  description: 'Khám phá mod, bản Việt hóa và nội dung cộng đồng dành cho nhiều tựa game.',
  alternates: { canonical: '/mods' },
};

export default function ModsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
