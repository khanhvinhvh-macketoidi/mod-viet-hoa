import Link from 'next/link';
import { BookOpenText, Home } from 'lucide-react';

export default function NotFoundPage() {
  return (
    <section className="iv2-auth-shell">
      <div className="iv2-form-card iv2-auth-card">
        <div className="relative z-10 text-center">
          <span className="iv2-icon mx-auto h-12 w-12">
            <BookOpenText size={20} />
          </span>

          <p className="iv2-kicker mt-5">404 · Bí cảnh không tồn tại</p>
          <h1 className="iv2-auth-title mt-2">Bí cảnh này không tồn tại</h1>
          <p className="iv2-auth-subtitle">
            Nội dung có thể đã được di chuyển, đổi tên hoặc không còn
            được công khai.
          </p>

          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <Link href="/mods" className="iv2-submit">
              <BookOpenText size={16} />
              Mở thư viện
            </Link>

            <Link href="/" className="iv2-form-secondary">
              <Home size={16} />
              Trang chủ
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
