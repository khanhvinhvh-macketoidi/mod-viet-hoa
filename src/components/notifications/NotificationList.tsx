'use client';

import Link from 'next/link';
import { useState } from 'react';
import type { NotificationItem } from '@/lib/notifications';
import styles from './NotificationList.module.css';

type Props = {
  initialNotifications: NotificationItem[];
  initialUnreadCount: number;
};

function formatDate(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

export default function NotificationList({
  initialNotifications,
  initialUnreadCount,
}: Props) {
  const [notifications, setNotifications] =
    useState(initialNotifications);
  const [unreadCount, setUnreadCount] =
    useState(initialUnreadCount);
  const [loadingId, setLoadingId] =
    useState<string | null>(null);
  const [markingAll, setMarkingAll] =
    useState(false);

  async function markRead(id: string) {
    const item = notifications.find(
      (notification) => notification.id === id,
    );

    if (!item || item.isRead) {
      return;
    }

    await fetch(`/api/notifications/${id}`, {
      method: 'PATCH',
    });

    setNotifications((current) =>
      current.map((notification) =>
        notification.id === id
          ? {
              ...notification,
              isRead: true,
              readAt: new Date().toISOString(),
            }
          : notification,
      ),
    );

    setUnreadCount((current) =>
      Math.max(0, current - 1),
    );
  }

  async function markAllRead() {
    setMarkingAll(true);

    try {
      await fetch('/api/notifications', {
        method: 'PATCH',
      });

      setNotifications((current) =>
        current.map((notification) => ({
          ...notification,
          isRead: true,
          readAt:
            notification.readAt ??
            new Date().toISOString(),
        })),
      );

      setUnreadCount(0);
    } finally {
      setMarkingAll(false);
    }
  }

  async function removeNotification(id: string) {
    setLoadingId(id);

    try {
      const response = await fetch(
        `/api/notifications/${id}`,
        {
          method: 'DELETE',
        },
      );

      if (!response.ok) {
        return;
      }

      const target = notifications.find(
        (notification) => notification.id === id,
      );

      setNotifications((current) =>
        current.filter(
          (notification) => notification.id !== id,
        ),
      );

      if (target && !target.isRead) {
        setUnreadCount((current) =>
          Math.max(0, current - 1),
        );
      }
    } finally {
      setLoadingId(null);
    }
  }

  return (
    <section className={styles.panel}>
      <div className={styles.toolbar}>
        <strong>
          {notifications.length} truyền âm
          {unreadCount > 0
            ? ` · ${unreadCount} chưa đọc`
            : ''}
        </strong>

        {unreadCount > 0 && (
          <button
            type="button"
            disabled={markingAll}
            onClick={() => void markAllRead()}
          >
            {markingAll
              ? 'Đang cập nhật...'
              : 'Đánh dấu tất cả đã đọc'}
          </button>
        )}
      </div>

      {notifications.length > 0 ? (
        <div className={styles.list}>
          {notifications.map((notification) => (
            <article
              key={notification.id}
              className={
                notification.isRead
                  ? styles.item
                  : styles.unreadItem
              }
            >
              <div className={styles.icon}>
                {notification.type === 'FOLLOW'
                  ? '👤'
                  : notification.type ===
                      'MOD_PUBLISHED'
                    ? '🧩'
                    : '🔔'}
              </div>

              <div className={styles.content}>
                <Link
                  href={notification.href}
                  onClick={() =>
                    void markRead(notification.id)
                  }
                >
                  <strong>{notification.title}</strong>
                  <span>{notification.message}</span>
                </Link>

                <small>
                  {formatDate(notification.createdAt)}
                </small>
              </div>

              <div className={styles.actions}>
                {!notification.isRead && (
                  <button
                    type="button"
                    onClick={() =>
                      void markRead(notification.id)
                    }
                  >
                    Đã đọc
                  </button>
                )}

                <button
                  type="button"
                  disabled={
                    loadingId === notification.id
                  }
                  onClick={() =>
                    void removeNotification(
                      notification.id,
                    )
                  }
                >
                  Xóa
                </button>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className={styles.empty}>
          <strong>Chưa có truyền âm.</strong>
          <p>
            Các lượt theo dõi và mod mới từ tác giả đạo hữu quan tâm
            sẽ xuất hiện tại đây.
          </p>
        </div>
      )}
    </section>
  );
}
