'use client';

import { useEffect, useState } from 'react';
import { ArrowUp } from 'lucide-react';

export default function ScrollChrome() {
  const [showBackToTop, setShowBackToTop] = useState(false);

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

  return (
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
      <span className="iv2-back-to-top-label">
        Về đầu trang
      </span>
    </button>
  );
}