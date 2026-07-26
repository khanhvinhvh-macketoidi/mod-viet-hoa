'use client';

import { useEffect, useRef, useState } from 'react';
import {
  ArrowUp,
  ExternalLink,
  MessageCircle,
  X,
} from 'lucide-react';

const MESSENGER_URL =
  process.env.NEXT_PUBLIC_SUPPORT_MESSENGER_URL ||
  'https://m.me/kensee1903';
const ZALO_URL =
  process.env.NEXT_PUBLIC_SUPPORT_ZALO_URL ||
  'https://zalo.me/0866850392';

export default function ScrollChrome() {
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [supportOpen, setSupportOpen] = useState(false);
  const supportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let lastScrollY = window.scrollY;
    let ticking = false;

    const update = () => {
      const currentScrollY = window.scrollY;
      const header = document.querySelector<HTMLElement>('.iv2-header');

      if (header) {
        const difference = currentScrollY - lastScrollY;

        if (currentScrollY <= 20) {
          header.classList.remove('is-scroll-hidden');
        } else if (difference > 0) {
          header.classList.add('is-scroll-hidden');
        } else if (difference < 0) {
          header.classList.remove('is-scroll-hidden');
        }
      }

      setShowBackToTop(currentScrollY > 320);

      lastScrollY = currentScrollY;
      ticking = false;
    };

    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(update);
        ticking = true;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleScroll);

      document
        .querySelector<HTMLElement>('.iv2-header')
        ?.classList.remove('is-scroll-hidden');
    };
  }, []);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (
        supportRef.current &&
        !supportRef.current.contains(
          event.target instanceof Node ? event.target : null,
        )
      ) {
        setSupportOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setSupportOpen(false);
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
    <div className="iv2-floating-actions">
      <div ref={supportRef} className="iv2-support-float">
        {supportOpen && (
          <div className="iv2-support-float-menu" role="menu">
            <a
              href={MESSENGER_URL}
              target="_blank"
              rel="noreferrer"
              role="menuitem"
            >
              <MessageCircle size={17} />
              Messenger
              <ExternalLink size={13} />
            </a>
            <a
              href={ZALO_URL}
              target="_blank"
              rel="noreferrer"
              role="menuitem"
            >
              <MessageCircle size={17} />
              Zalo
              <ExternalLink size={13} />
            </a>
          </div>
        )}

        <button
          type="button"
          className={`iv2-support-float-button${
            supportOpen ? ' is-open' : ''
          }`}
          aria-expanded={supportOpen}
          aria-haspopup="menu"
          onClick={() => setSupportOpen((current) => !current)}
          title="Liên hệ hỗ trợ"
        >
          {supportOpen ? <X size={18} /> : <MessageCircle size={18} />}
          <span>Liên hệ hỗ trợ</span>
        </button>
      </div>

      <button
        type="button"
        className={`iv2-back-to-top${showBackToTop ? ' is-visible' : ''}`}
        onClick={() => {
          window.scrollTo({
            top: 0,
            behavior: 'smooth',
          });
        }}
        aria-label="Về đầu trang"
        title="Về đầu trang"
      >
        <ArrowUp size={18} aria-hidden="true" />
        <span className="iv2-back-to-top-label">Về đầu trang</span>
      </button>
    </div>
  );
}
