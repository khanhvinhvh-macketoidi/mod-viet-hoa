import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { getAuthorStats } from '@/lib/author-stats';
import { getModsByAuthorId } from '@/lib/mods';
import { getUserAvatar } from '@/lib/users';
import AuthorCenter from '@/components/author-center/AuthorCenter';
import ModCard from '@/components/ModCard';

export default async function ProfilePage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login?next=/profile');
  }

  const [mods, stats] = await Promise.all([
    getModsByAuthorId(user.id),
    getAuthorStats(user.id),
  ]);

  return (
    <AuthorCenter
      user={user}
      stats={stats}
      avatar={getUserAvatar(user)}
      isOwner
      mods={
        mods.length > 0 ? (
          <div className="author-mods-grid">
            {mods.map((mod) => (
              <ModCard key={mod.id} mod={mod} />
            ))}
          </div>
        ) : (
          <div className="author-empty">
            Chưa có mod nào được liên kết với tài khoản này.
          </div>
        )
      }
    />
  );
}
