'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import styles from './NotificationBell.module.css';

type NotificationItem = {
  id: string;
  type: 'FOLLOW' | 'MOD_PUBLISHED' | 'SYSTEM';
  title: string;
  message: string;
  href: string;
  isRead: boolean;
  createdAt: string;
};

type ApiResponse = {
  ok: boolean;
  notifications?: NotificationItem[];
  unreadCount?: number;
  message?: string;
};

function formatRelativeTime(value: string): string {
  const date = new Date(value);
  const diff = Date.now() - date.getTime();

  if (!Number.isFinite(diff)) return '';

  const minutes = Math.floor(diff / 60000);

  if (minutes < 1) return 'Vừa xong';
  if (minutes < 60) return `${minutes} phút trước`;

  const hours = Math.floor(minutes / 60);

  if (hours < 24) return `${hours} giờ trước`;

  const days = Math.floor(hours / 24);

  if (days < 7) return `${days} ngày trước`;

  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
}

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<
    NotificationItem[]
  >([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const loadNotifications = useCallback(async () => {
    setLoading(true);

    try {
      const response = await fetch(
        '/api/notifications?limit=6',
        {
          cache: 'no-store',
        },
      );

      if (response.status === 401) {
        setNotifications([]);
        setUnreadCount(0);
        return;
      }

      const data = (await response.json()) as ApiResponse;

      if (!response.ok) {
        throw new Error(
          data.message || 'Không thể tải truyền âm.',
        );
      }

      setNotifications(data.notifications ?? []);
      setUnreadCount(data.unreadCount ?? 0);
    } catch {
      // Không hiển thị lỗi tại header để tránh làm gián đoạn giao diện.
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const initialLoad = window.setTimeout(
      () => void loadNotifications(),
      0,
    );

    const interval = window.setInterval(
      () => void loadNotifications(),
      30000,
    );

    return () => {
      window.clearTimeout(initialLoad);
      window.clearInterval(interval);
    };
  }, [loadNotifications]);

  useEffect(() => {
    function handleOutsideClick(event: MouseEvent) {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(
          event.target as Node,
        )
      ) {
        setOpen(false);
      }
    }

    document.addEventListener(
      'mousedown',
      handleOutsideClick,
    );

    return () =>
      document.removeEventListener(
        'mousedown',
        handleOutsideClick,
      );
  }, []);

  async function markRead(
    notification: NotificationItem,
  ) {
    if (!notification.isRead) {
      await fetch(
        `/api/notifications/${notification.id}`,
        {
          method: 'PATCH',
        },
      );

      setNotifications((current) =>
        current.map((item) =>
          item.id === notification.id
            ? { ...item, isRead: true }
            : item,
        ),
      );

      setUnreadCount((current) =>
        Math.max(0, current - 1),
      );
    }

    setOpen(false);
  }

  async function markAllRead() {
    await fetch('/api/notifications', {
      method: 'PATCH',
    });

    setNotifications((current) =>
      current.map((item) => ({
        ...item,
        isRead: true,
      })),
    );

    setUnreadCount(0);
  }

  return (
    <div className={styles.wrapper} ref={wrapperRef}>
      <button
        type="button"
        className={styles.bellButton}
        aria-label="Truyền âm"
        aria-expanded={open}
        onClick={() => {
          setOpen((current) => !current);

          if (!open) {
            void loadNotifications();
          }
        }}
      >
        <span aria-hidden="true">🔔</span>

        {unreadCount > 0 && (
          <b>
            {unreadCount > 99 ? '99+' : unreadCount}
          </b>
        )}
      </button>

      {open && (
        <div className={styles.dropdown}>
          <div className={styles.header}>
            <strong>Truyền âm</strong>

            {unreadCount > 0 && (
              <button
                type="button"
                onClick={() => void markAllRead()}
              >
                Đánh dấu tất cả đã đọc
              </button>
            )}
          </div>

          {loading && notifications.length === 0 ? (
            <div className={styles.empty}>
              Đang lĩnh ngộ thiên cơ...
            </div>
          ) : notifications.length > 0 ? (
            <div className={styles.list}>
              {notifications.map((notification) => (
                <Link
                  key={notification.id}
                  href={notification.href}
                  className={
                    notification.isRead
                      ? styles.item
                      : styles.unreadItem
                  }
                  onClick={() =>
                    void markRead(notification)
                  }
                >
                  <span className={styles.icon}>
                    {notification.type === 'FOLLOW'
                      ? '👤'
                      : notification.type ===
                          'MOD_PUBLISHED'
                        ? '🧩'
                        : '🔔'}
                  </span>

                  <span className={styles.content}>
                    <strong>{notification.title}</strong>
                    <span>{notification.message}</span>
                    <small>
                      {formatRelativeTime(
                        notification.createdAt,
                      )}
                    </small>
                  </span>
                </Link>
              ))}
            </div>
          ) : (
            <div className={styles.empty}>
              Chưa có truyền âm.
            </div>
          )}

          <Link
            href="/notifications"
            className={styles.viewAll}
            onClick={() => setOpen(false)}
          >
            Xem tất cả truyền âm
          </Link>
        </div>
      )}
    </div>
  );
}
