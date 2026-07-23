import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { getFollowingIds } from '@/lib/follows';
import {
  getUserById,
  toPublicUserProfile,
} from '@/lib/users';
import UserFollowCard from '@/components/follows/UserFollowCard';
import styles from './following.module.css';

export default async function FollowingPage() {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect('/login?next=/profile/following');
  }

  const ids = await getFollowingIds(
    currentUser.id,
  );

  const users = (
    await Promise.all(
      ids.map((id) => getUserById(id)),
    )
  )
    .filter(
      (user) =>
        user !== undefined &&
        user.isActive !== false,
    )
    .map((user) =>
      toPublicUserProfile(user!),
    );

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <header>
          <div>
            <span>Đạo tịch cá nhân</span>
            <h1>Đã kết giao</h1>
            <p>
              Danh sách tác giả và đạo hữu đang kết giao.
            </p>
          </div>

          <Link href="/profile">
            Quay lại đạo tịch
          </Link>
        </header>

        {users.length > 0 ? (
          <div className={styles.grid}>
            {users.map((user) => (
              <UserFollowCard
                key={user.id}
                user={user}
              />
            ))}
          </div>
        ) : (
          <section className={styles.empty}>
            <strong>Đạo hữu chưa kết giao với ai.</strong>
            <p>
              Mở đạo tịch tác giả và nhấn Kết giao để thêm họ vào danh sách.
            </p>
            <Link href="/mods">
              Khám phá thư viện mod
            </Link>
          </section>
        )}
      </div>
    </main>
  );
}
