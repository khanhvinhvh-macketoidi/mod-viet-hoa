import Link from 'next/link';
import type { PublicUserProfile } from '@/lib/types';
import styles from './UserFollowCard.module.css';

type Props = {
  user: PublicUserProfile;
};

export default function UserFollowCard({
  user,
}: Props) {
  const displayName =
    user.profile.displayName || user.name;

  return (
    <Link
      href={`/authors/${user.profileSlug}`}
      className={styles.card}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={
          user.profile.avatar ||
          '/images/default-avatar.png'
        }
        alt=""
      />

      <div>
        <strong>{displayName}</strong>
        <span>@{user.name}</span>
        <small>{user.role}</small>
      </div>
    </Link>
  );
}
