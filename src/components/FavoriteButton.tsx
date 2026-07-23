'use client';

import { Heart } from 'lucide-react';
import { useState } from 'react';

type Props = {
  modId: string;
  initialFavorited: boolean;
  initialCount: number;
  isLoggedIn: boolean;
  compact?: boolean;
};

export default function FavoriteButton({
  modId,
  initialFavorited,
  initialCount,
  isLoggedIn,
  compact = false,
}: Props) {
  const [favorited, setFavorited] =
    useState(initialFavorited);
  const [count, setCount] =
    useState(initialCount);
  const [loading, setLoading] =
    useState(false);
  const [pulse, setPulse] =
    useState(false);
  const [error, setError] = useState('');

  async function toggle() {
    if (!isLoggedIn) {
      window.location.href = `/login?next=${encodeURIComponent(
        window.location.pathname,
      )}`;
      return;
    }

    if (loading) return;

    setError('');

    const previous = {
      favorited,
      count,
    };

    const nextFavorited = !favorited;

    setFavorited(nextFavorited);
    setCount((current) =>
      Math.max(
        0,
        current + (nextFavorited ? 1 : -1),
      ),
    );

    setPulse(true);
    window.setTimeout(
      () => setPulse(false),
      280,
    );

    setLoading(true);

    try {
      const response = await fetch(
        `/api/mods/${modId}/favorite`,
        {
          method: 'POST',
        },
      );

      const data = (await response.json()) as {
        ok: boolean;
        favorited?: boolean;
        count?: number;
      };

      if (!response.ok || !data.ok) {
        setFavorited(previous.favorited);
        setCount(previous.count);
        setError('Không thể cập nhật tâm đắc.');
        return;
      }

      setFavorited(
        data.favorited ?? previous.favorited,
      );
      setCount(data.count ?? previous.count);
    } catch {
      setFavorited(previous.favorited);
      setCount(previous.count);
      setError('Không thể cập nhật tâm đắc.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
    <button
      type="button"
      onClick={() => void toggle()}
      aria-pressed={favorited}
      className={
        compact
          ? favorited
            ? 'inline-flex items-center gap-1.5 rounded-full border border-rose-400/30 bg-rose-500/15 px-2.5 py-1 text-xs font-semibold text-rose-300'
            : 'inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs font-semibold text-slate-400 hover:bg-white/10'
          : favorited
            ? 'inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-rose-400/30 bg-rose-500/15 px-4 py-3 font-bold text-rose-300'
            : 'inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 font-bold text-slate-300 hover:bg-white/10'
      }
    >
      <Heart
        className={
          pulse
            ? 'h-5 w-5 scale-125 transition-transform'
            : compact
              ? 'h-3.5 w-3.5 transition-transform'
              : 'h-5 w-5 transition-transform'
        }
        fill={
          favorited ? 'currentColor' : 'none'
        }
      />
      <span>
        {compact
          ? count
          : favorited
            ? `Đã tâm đắc (${count})`
            : `Tâm đắc (${count})`}
      </span>
    </button>
    <span aria-live="polite" className="sr-only">{error}</span>
    </div>
  );
}
