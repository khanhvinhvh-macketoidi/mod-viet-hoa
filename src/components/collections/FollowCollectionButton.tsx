'use client';

import {
  Bell,
  BellOff,
} from 'lucide-react';
import { useState } from 'react';

type Props = {
  collectionId: string;
  initialFollowing: boolean;
  initialCount: number;
  isLoggedIn: boolean;
};

export default function FollowCollectionButton({
  collectionId,
  initialFollowing,
  initialCount,
  isLoggedIn,
}: Props) {
  const [following, setFollowing] =
    useState(initialFollowing);
  const [count, setCount] =
    useState(initialCount);
  const [loading, setLoading] =
    useState(false);

  async function toggle() {
    if (!isLoggedIn) {
      window.location.href = `/login?next=${encodeURIComponent(
        window.location.pathname,
      )}`;
      return;
    }

    if (loading) return;

    const previous = {
      following,
      count,
    };

    const nextFollowing = !following;

    setFollowing(nextFollowing);
    setCount((current) =>
      Math.max(
        0,
        current +
          (nextFollowing ? 1 : -1),
      ),
    );
    setLoading(true);

    try {
      const response = await fetch(
        `/api/collections/${collectionId}/follow`,
        {
          method: 'POST',
        },
      );

      const data = (await response.json()) as {
        ok: boolean;
        following?: boolean;
        count?: number;
      };

      if (!response.ok || !data.ok) {
        setFollowing(previous.following);
        setCount(previous.count);
        return;
      }

      setFollowing(
        data.following ?? previous.following,
      );
      setCount(data.count ?? previous.count);
    } catch {
      setFollowing(previous.following);
      setCount(previous.count);
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={() => void toggle()}
      disabled={loading}
      aria-pressed={following}
      className={
        following
          ? 'inline-flex items-center gap-2 rounded-xl border border-sky-400/30 bg-sky-400/15 px-4 py-2 font-semibold text-sky-200 disabled:opacity-60'
          : 'inline-flex items-center gap-2 rounded-xl border border-white/10 px-4 py-2 font-semibold text-slate-200 hover:bg-white/5 disabled:opacity-60'
      }
    >
      {following ? (
        <Bell className="h-4 w-4" />
      ) : (
        <BellOff className="h-4 w-4" />
      )}

      {following
        ? `Đã kết giao (${count})`
        : `Kết giao (${count})`}
    </button>
  );
}
