'use client';

import { useEffect } from 'react';

export default function CultivationModViewTracker({
  modId,
}: {
  modId: string;
}) {
  useEffect(() => {
    void fetch(`/api/mods/${encodeURIComponent(modId)}/view`, {
      method: 'POST',
      credentials: 'same-origin',
      cache: 'no-store',
      keepalive: true,
    }).catch(() => {
      // View rewards are best-effort and must never interrupt the mod page.
    });
  }, [modId]);

  return null;
}
