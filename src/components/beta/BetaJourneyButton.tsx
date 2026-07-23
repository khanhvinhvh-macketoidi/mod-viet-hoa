'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { ArrowRight, Sparkles } from 'lucide-react';
import { SITE_INFO } from '@/config/site';

export default function BetaJourneyButton() {
  const router = useRouter();
  const [leaving, setLeaving] = useState(false);

  function beginJourney() {
    try {
      window.localStorage.setItem(SITE_INFO.betaStorageKey, 'accepted');
    } catch {
      // Local storage may be unavailable in private browsing; navigation still works.
    }

    setLeaving(true);
    window.setTimeout(() => router.push('/'), 650);
  }

  return (
    <div className="text-center">
      <button
        type="button"
        onClick={beginJourney}
        disabled={leaving}
        className="iv2-button iv2-button-primary min-h-12 px-6 disabled:cursor-wait disabled:opacity-70"
      >
        <Sparkles size={18} />
        {leaving ? 'Thiên địa đang khai mở...' : 'Bắt đầu hành trình'}
        {!leaving && <ArrowRight size={18} />}
      </button>

      <p
        className={`mt-4 text-sm text-[#a3ead3] transition duration-500 ${
          leaving ? 'translate-y-0 opacity-100' : 'translate-y-1 opacity-0'
        }`}
        aria-live="polite"
      >
        Thiên địa đã khai mở. Chúc đạo hữu có một chuyến hành trình thuận lợi.
      </p>
    </div>
  );
}
