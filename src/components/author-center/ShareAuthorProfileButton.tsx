'use client';

import { useState } from 'react';
import { Check, Share2 } from 'lucide-react';

type ShareAuthorProfileButtonProps = {
  profilePath: string;
};

export default function ShareAuthorProfileButton({
  profilePath,
}: ShareAuthorProfileButtonProps) {
  const [copied, setCopied] = useState(false);

  async function handleShare() {
    const url = new URL(profilePath, window.location.origin).toString();

    try {
      if (navigator.share) {
        await navigator.share({ url });
        return;
      }

      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      // The user may cancel the native share sheet. No error UI is needed.
    }
  }

  return (
    <button
      type="button"
      className="iv2-form-secondary author-share-button"
      onClick={handleShare}
      aria-live="polite"
    >
      {copied ? <Check size={15} /> : <Share2 size={15} />}
      {copied ? 'Đã thu vào ngọc giản' : 'Chia sẻ đạo tịch'}
    </button>
  );
}
