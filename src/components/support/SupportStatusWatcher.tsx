'use client';

import { useEffect, useRef } from 'react';

type Props = {
  initialTransactionCount: number;
  initialTotalAmount: number;
};

type StatusResponse = {
  ok: boolean;
  summary?: {
    transactionCount: number;
    totalAmount: number;
  };
};

export default function SupportStatusWatcher({
  initialTransactionCount,
  initialTotalAmount,
}: Props) {
  const reloadingRef = useRef(false);

  useEffect(() => {
    let disposed = false;

    async function checkStatus() {
      if (disposed || reloadingRef.current || document.hidden) return;

      try {
        const response = await fetch('/api/support/status', {
          cache: 'no-store',
          headers: {
            Accept: 'application/json',
          },
        });

        if (!response.ok) return;

        const data = (await response.json()) as StatusResponse;
        const summary = data.summary;

        if (
          summary &&
          (summary.transactionCount > initialTransactionCount ||
            summary.totalAmount > initialTotalAmount)
        ) {
          reloadingRef.current = true;
          window.location.reload();
        }
      } catch {
        // Mất kết nối tạm thời không làm gián đoạn trang ủng hộ.
      }
    }

    const interval = window.setInterval(() => void checkStatus(), 8_000);
    const handleVisibility = () => {
      if (!document.hidden) void checkStatus();
    };

    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      disposed = true;
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [initialTotalAmount, initialTransactionCount]);

  return null;
}
