'use client';

import { useEffect } from 'react';

const HIGHLIGHT_CLASS = 'comment-focus-highlight';
const HIGHLIGHT_DURATION_MS = 2800;

function focusHashComment() {
  const rawHash = window.location.hash;

  if (!rawHash.startsWith('#comment-')) {
    return;
  }

  const id = decodeURIComponent(rawHash.slice(1));
  const element = document.getElementById(id);

  if (!element) {
    return;
  }

  window.requestAnimationFrame(() => {
    element.scrollIntoView({
      behavior: 'smooth',
      block: 'center',
    });

    element.classList.remove(HIGHLIGHT_CLASS);

    window.requestAnimationFrame(() => {
      element.classList.add(HIGHLIGHT_CLASS);

      window.setTimeout(() => {
        element.classList.remove(HIGHLIGHT_CLASS);
      }, HIGHLIGHT_DURATION_MS);
    });
  });
}

export default function CommentHashFocus() {
  useEffect(() => {
    focusHashComment();

    const onHashChange = () => {
      focusHashComment();
    };

    window.addEventListener('hashchange', onHashChange);

    return () => {
      window.removeEventListener(
        'hashchange',
        onHashChange,
      );
    };
  }, []);

  return null;
}
