'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { AlertTriangle, Home, RotateCcw } from 'lucide-react';

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Application error:', error);
  }, [error]);

  return (
    <section className="iv2-auth-shell">
      <div className="iv2-form-card iv2-auth-card">
        <div className="relative z-10 text-center">
          <span className="iv2-icon mx-auto h-12 w-12">
            <AlertTriangle size={20} />
          </span>

          <p className="iv2-kicker mt-5">Linh mạch tạm thời gián đoạn</p>
          <h1 className="iv2-auth-title mt-2">Không thể tải nội dung</h1>
          <p className="iv2-auth-subtitle">
            Thiên đạo vừa phát sinh nhiễu loạn. Đạo hữu có thể tải lại trang hoặc
            quay về Tàng Kinh Các.
          </p>

          {error.digest && (
            <p className="mt-4 text-xs text-[var(--theme-text-4)]">
              Mã lỗi: {error.digest}
            </p>
          )}

          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <button
              type="button"
              className="iv2-submit"
              onClick={reset}
            >
              <RotateCcw size={16} />
              Vận công thử lại
            </button>

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
