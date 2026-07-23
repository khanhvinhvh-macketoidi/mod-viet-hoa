import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getFollowerIds } from '@/lib/follows';
import {
  getPublicUserByProfileSlug,
  getUserById,
  toPublicUserProfile,
} from '@/lib/users';
import UserFollowCard from '@/components/follows/UserFollowCard';
import styles from './followers.module.css';

type PageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function FollowersPage({
  params,
}: PageProps) {
  const { slug } = await params;

  const author =
    await getPublicUserByProfileSlug(slug);

  if (!author) {
    notFound();
  }

  const ids = await getFollowerIds(author.id);

  const followers = (
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
            <span>Đạo tịch tác giả</span>
            <h1>
              Đồng đạo {author.profile.displayName}
            </h1>
            <p>
              {followers.length} thành viên đang theo dõi hồ sơ này.
            </p>
          </div>

          <Link
            href={`/authors/${author.profileSlug}`}
          >
            Quay lại đạo tịch
          </Link>
        </header>

        {followers.length > 0 ? (
          <div className={styles.grid}>
            {followers.map((user) => (
              <UserFollowCard
                key={user.id}
                user={user}
              />
            ))}
          </div>
        ) : (
          <section className={styles.empty}>
            Chưa có đồng đạo.
          </section>
        )}
      </div>
    </main>
  );
}
