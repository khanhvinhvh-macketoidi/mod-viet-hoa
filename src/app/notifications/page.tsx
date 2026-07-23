import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import {
  getNotificationsByUserId,
  getUnreadNotificationCount,
} from '@/lib/notifications';
import NotificationList from '@/components/notifications/NotificationList';
import styles from './notifications.module.css';

export default async function NotificationsPage() {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect('/login?next=/notifications');
  }

  const [notifications, unreadCount] =
    await Promise.all([
      getNotificationsByUserId(currentUser.id),
      getUnreadNotificationCount(currentUser.id),
    ]);

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <header className={styles.header}>
          <div>
            <span>Trung tâm truyền âm</span>
            <h1>Truyền âm</h1>
            <p>
              {unreadCount > 0
                ? `Đạo hữu có ${unreadCount} truyền âm chưa đọc.`
                : 'Đạo hữu đã đọc tất cả truyền âm.'}
            </p>
          </div>

          <Link href="/profile">
            Về đạo tịch
          </Link>
        </header>

        <NotificationList
          initialNotifications={notifications}
          initialUnreadCount={unreadCount}
        />
      </div>
    </main>
  );
}
