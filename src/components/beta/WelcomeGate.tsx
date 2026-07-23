'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ArrowRight, BookOpenText, Sparkles, X } from 'lucide-react';
import { SITE_INFO } from '@/config/site';

export default function WelcomeGate() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    if (pathname === '/beta') return;

    let accepted = false;
    try {
      accepted = window.localStorage.getItem(SITE_INFO.betaStorageKey) === 'accepted';
    } catch {
      accepted = true;
    }

    if (!accepted) {
      const timer = window.setTimeout(() => setVisible(true), 250);
      return () => window.clearTimeout(timer);
    }
  }, [pathname]);

  useEffect(() => {
    if (!visible) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') dismiss();
    }

    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [visible]);

  function rememberAccepted() {
    try {
      window.localStorage.setItem(SITE_INFO.betaStorageKey, 'accepted');
    } catch {
      // The gate still closes when storage is unavailable.
    }
  }

  function dismiss() {
    rememberAccepted();
    setClosing(true);
    window.setTimeout(() => setVisible(false), 350);
  }

  if (!visible || pathname === '/beta') return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="beta-welcome-title"
      className={`fixed inset-0 z-[100] grid place-items-center overflow-y-auto bg-[#020711]/88 p-4 backdrop-blur-xl transition duration-300 ${
        closing ? 'opacity-0' : 'opacity-100'
      }`}
    >
      <div
        className={`relative my-auto w-full max-w-2xl overflow-hidden rounded-[28px] border border-[#36d7ff]/20 bg-[#06111f]/96 shadow-[0_30px_100px_rgba(0,0,0,.65),0_0_70px_rgba(54,215,255,.08)] transition duration-500 ${
          closing ? 'translate-y-3 scale-[.98]' : 'translate-y-0 scale-100'
        }`}
      >
        <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-[#36d7ff]/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-28 -left-20 h-64 w-64 rounded-full bg-[#8f70ff]/10 blur-3xl" />

        <button
          type="button"
          onClick={dismiss}
          className="absolute right-4 top-4 z-10 grid h-10 w-10 place-items-center rounded-xl text-[#7892a5] transition hover:bg-white/5 hover:text-white"
          aria-label="Đóng lời chào Thử nghiệm mở"
        >
          <X size={18} />
        </button>

        <div className="relative p-7 sm:p-10">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#e7c66f]/30 bg-[#e7c66f]/10 px-3 py-1.5 text-[11px] font-black tracking-[0.14em] text-[#f2db93]">
            <Sparkles size={13} /> {SITE_INFO.stageLabel} · v{SITE_INFO.version}
          </div>

          <h2 id="beta-welcome-title" className="iv2-display mt-6 text-3xl font-black leading-tight text-white sm:text-4xl">
            Chào mừng đạo hữu đến với <span className="iv2-gradient-text">MOD Việt Hóa</span>
          </h2>

          <p className="mt-5 text-sm leading-7 text-[#a5bdcf] sm:text-base">
            MOD Việt Hóa hiện đang trong giai đoạn <strong className="text-[#f2db93]">Thử nghiệm mở</strong>.
            Trong thời gian này, đạo hữu có thể bắt gặp một vài tính năng đang được hoàn thiện,
            những thay đổi thường xuyên hoặc một số lỗi nhỏ ngoài dự kiến.
          </p>

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            {[
              ['Cùng hoàn thiện', 'Mỗi góp ý đều giúp tiên giới vững vàng hơn.'],
              ['Cập nhật thường xuyên', 'Các bí thuật mới sẽ liên tục được bổ sung.'],
              ['Chung tay xây dựng', 'Đăng mod, chia sẻ và mời thêm đồng đạo.'],
            ].map(([title, text]) => (
              <div key={title} className="rounded-2xl border border-[#36d7ff]/10 bg-[#071727]/65 p-4">
                <p className="text-sm font-bold text-[#eafaff]">{title}</p>
                <p className="mt-1 text-xs leading-5 text-[#7892a5]">{text}</p>
              </div>
            ))}
          </div>

          <p className="mt-6 text-sm italic leading-6 text-[#a3ead3]">{SITE_INFO.gratitude}</p>

          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <button type="button" onClick={dismiss} className="iv2-button iv2-button-primary min-h-11 flex-1">
              <Sparkles size={17} /> Bắt đầu tu lộ <ArrowRight size={17} />
            </button>

            <Link href="/beta" onClick={rememberAccepted} className="iv2-button iv2-button-secondary min-h-11 flex-1">
              <BookOpenText size={17} /> Tìm hiểu giai đoạn thử nghiệm
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
