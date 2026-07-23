'use client';

import { useState } from 'react';
import styles from './FollowButton.module.css';

type Props = {
  targetUserId: string;
  initialFollowing: boolean;
  initialFollowerCount: number;
  isAuthenticated: boolean;
  isOwnProfile: boolean;
};

type ApiResponse = {
  ok: boolean;
  following?: boolean;
  followerCount?: number;
  message?: string;
};

export default function FollowButton({
  targetUserId,
  initialFollowing,
  initialFollowerCount,
  isAuthenticated,
  isOwnProfile,
}: Props) {
  const [following, setFollowing] =
    useState(initialFollowing);
  const [followerCount, setFollowerCount] =
    useState(initialFollowerCount);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  if (isOwnProfile) {
    return (
      <div className={styles.wrapper}>
        <span className={styles.count}>
          {followerCount} đồng đạo
        </span>
      </div>
    );
  }

  async function toggleFollow() {
    if (!isAuthenticated) {
      window.location.assign(
        `/login?next=${encodeURIComponent(
          window.location.pathname,
        )}`,
      );
      return;
    }

    if (loading) {
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      const response = await fetch('/api/follows', {
        method: following ? 'DELETE' : 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: targetUserId,
        }),
      });

      const data =
        (await response.json()) as ApiResponse;

      if (!response.ok) {
        throw new Error(
          data.message || 'Không thể cập nhật theo dõi.',
        );
      }

      setFollowing(Boolean(data.following));
      setFollowerCount(
        data.followerCount ?? followerCount,
      );
      setMessage(data.message ?? '');
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : 'Không thể cập nhật theo dõi.',
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.wrapper}>
      <button
        type="button"
        className={
          following
            ? styles.followingButton
            : styles.followButton
        }
        disabled={loading}
        onClick={() => void toggleFollow()}
      >
        {loading
          ? 'Đang xử lý...'
          : following
            ? 'Đã kết giao'
            : 'Kết giao'}
      </button>

      <span className={styles.count}>
        {followerCount} đồng đạo
      </span>

      {message && (
        <span className={styles.message}>
          {message}
        </span>
      )}
    </div>
  );
}
