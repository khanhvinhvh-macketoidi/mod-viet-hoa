'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from './LiveNotificationToaster.module.css';

type NotificationType =
  | 'FOLLOW'
  | 'MOD_PUBLISHED'
  | 'COMMENT'
  | 'REPLY'
  | 'REVIEW'
  | 'SYSTEM';

type NotificationItem = {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  href: string;
  isRead: boolean;
  createdAt: string;
  updatedAt?: string;
};

type ToastItem = NotificationItem & {
  toastId: string;
  eventKey: string;
};

type NotificationsResponse = {
  ok: boolean;
  notifications?: NotificationItem[];
};

const POLLING_INTERVAL_MS = 10_000;
const AUTO_DISMISS_MS = 7_000;
const MAX_VISIBLE_TOASTS = 3;
const SEEN_STORAGE_KEY =
  'mod-library-live-notification-seen-events-v3';

function getEventKey(item: NotificationItem): string {
  return `${item.id}:${item.updatedAt ?? item.createdAt}`;
}

function readSeenEvents(): Set<string> {
  try {
    const raw = sessionStorage.getItem(SEEN_STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];

    return new Set(
      Array.isArray(parsed)
        ? parsed.filter(
            (value): value is string =>
              typeof value === 'string',
          )
        : [],
    );
  } catch {
    return new Set();
  }
}

function writeSeenEvents(events: Set<string>) {
  try {
    sessionStorage.setItem(
      SEEN_STORAGE_KEY,
      JSON.stringify(Array.from(events).slice(-300)),
    );
  } catch {}
}

function getIcon(type: NotificationType): string {
  switch (type) {
    case 'FOLLOW':
      return '👤';
    case 'MOD_PUBLISHED':
      return '🧩';
    case 'COMMENT':
    case 'REPLY':
      return '💬';
    case 'REVIEW':
      return '⭐';
    default:
      return '🔔';
  }
}

export default function LiveNotificationToaster() {
  const router = useRouter();
  const [visible, setVisible] = useState<ToastItem[]>([]);
  const [queue, setQueue] = useState<ToastItem[]>([]);
  const initialized = useRef(false);
  const seenEvents = useRef<Set<string>>(new Set());
  const timers = useRef<Map<string, number>>(new Map());

  const remove = useCallback((toastId: string) => {
    const timer = timers.current.get(toastId);

    if (timer) {
      window.clearTimeout(timer);
      timers.current.delete(toastId);
    }

    setVisible((current) =>
      current.filter((item) => item.toastId !== toastId),
    );
  }, []);

  const schedule = useCallback(
    (toastId: string) => {
      const oldTimer = timers.current.get(toastId);
      if (oldTimer) window.clearTimeout(oldTimer);

      const timer = window.setTimeout(
        () => remove(toastId),
        AUTO_DISMISS_MS,
      );

      timers.current.set(toastId, timer);
    },
    [remove],
  );

  const pause = useCallback((toastId: string) => {
    const timer = timers.current.get(toastId);

    if (timer) {
      window.clearTimeout(timer);
      timers.current.delete(toastId);
    }
  }, []);

  useEffect(() => {
    if (
      queue.length === 0 ||
      visible.length >= MAX_VISIBLE_TOASTS
    ) {
      return;
    }

    const count = MAX_VISIBLE_TOASTS - visible.length;
    const next = queue.slice(0, count);
    const promotionTimer = window.setTimeout(() => {
      setQueue((current) => current.slice(count));
      setVisible((current) => [...current, ...next]);
      next.forEach((item) => schedule(item.toastId));
    }, 0);

    return () => window.clearTimeout(promotionTimer);
  }, [queue, visible.length, schedule]);

  const poll = useCallback(async () => {
    if (document.visibilityState !== 'visible') return;

    try {
      const response = await fetch(
        '/api/notifications?limit=30',
        { cache: 'no-store' },
      );

      if (response.status === 401) return;

      const data =
        (await response.json()) as NotificationsResponse;

      if (!response.ok || !data.ok) return;

      const notifications = data.notifications ?? [];

      if (!initialized.current) {
        const stored = readSeenEvents();

        notifications.forEach((item) =>
          stored.add(getEventKey(item)),
        );

        seenEvents.current = stored;
        writeSeenEvents(stored);
        initialized.current = true;
        return;
      }

      const fresh = notifications
        .filter(
          (item) =>
            !item.isRead &&
            !seenEvents.current.has(getEventKey(item)),
        )
        .sort(
          (a, b) =>
            new Date(
              a.updatedAt ?? a.createdAt,
            ).getTime() -
            new Date(
              b.updatedAt ?? b.createdAt,
            ).getTime(),
        );

      if (fresh.length === 0) return;

      const toasts = fresh.map((item) => {
        const eventKey = getEventKey(item);

        seenEvents.current.add(eventKey);

        return {
          ...item,
          eventKey,
          toastId: `${eventKey}-${Math.random()}`,
        };
      });

      writeSeenEvents(seenEvents.current);
      setQueue((current) => [...current, ...toasts]);
    } catch {}
  }, []);

  useEffect(() => {
    const initialPoll = window.setTimeout(() => void poll(), 0);
    const timerMap = timers.current;

    const interval = window.setInterval(
      () => void poll(),
      POLLING_INTERVAL_MS,
    );

    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        void poll();
      }
    };

    document.addEventListener(
      'visibilitychange',
      onVisible,
    );

    return () => {
      window.clearTimeout(initialPoll);
      window.clearInterval(interval);
      document.removeEventListener(
        'visibilitychange',
        onVisible,
      );
      timerMap.forEach((timer) =>
        window.clearTimeout(timer),
      );
      timerMap.clear();
    };
  }, [poll]);

  async function open(item: ToastItem) {
    pause(item.toastId);

    try {
      if (!item.isRead) {
        await fetch(`/api/notifications/${item.id}`, {
          method: 'PATCH',
        });
      }
    } finally {
      remove(item.toastId);
      router.push(item.href);
      router.refresh();
    }
  }

  if (visible.length === 0) return null;

  return (
    <section
      className={styles.viewport}
      aria-label="Truyền âm mới"
      aria-live="polite"
    >
      {visible.map((item) => (
        <article
          key={item.toastId}
          className={styles.toast}
          onMouseEnter={() => pause(item.toastId)}
          onMouseLeave={() => schedule(item.toastId)}
        >
          <button
            type="button"
            className={styles.mainButton}
            onClick={() => void open(item)}
          >
            <span className={styles.icon}>
              {getIcon(item.type)}
            </span>

            <span className={styles.content}>
              <strong>{item.title}</strong>
              <span>{item.message}</span>
              <small>Vừa xong</small>
            </span>
          </button>

          <button
            type="button"
            className={styles.closeButton}
            aria-label="Đóng truyền âm"
            onClick={() => remove(item.toastId)}
          >
            ×
          </button>

          <span
            className={styles.progress}
            style={{
              animationDuration: `${AUTO_DISMISS_MS}ms`,
            }}
          />
        </article>
      ))}
    </section>
  );
}
