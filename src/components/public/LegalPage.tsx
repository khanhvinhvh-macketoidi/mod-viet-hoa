import Link from 'next/link';
import type { ReactNode } from 'react';
import { ArrowLeft, Sparkles } from 'lucide-react';

export default function LegalPage({
  eyebrow,
  title,
  intro,
  children,
}: {
  eyebrow: string;
  title: string;
  intro: string;
  children: ReactNode;
}) {
  return (
    <main className="public-page">
      <div className="iv2-container public-page__container">
        <header className="public-page__hero">
          <span className="iv2-icon">
            <Sparkles size={18} />
          </span>
          <p className="iv2-kicker">{eyebrow}</p>
          <h1>{title}</h1>
          <p>{intro}</p>
        </header>

        <article className="public-page__article">{children}</article>

        <Link href="/" className="public-page__back">
          <ArrowLeft size={15} />
          Quay về trang chủ
        </Link>
      </div>
    </main>
  );
}
