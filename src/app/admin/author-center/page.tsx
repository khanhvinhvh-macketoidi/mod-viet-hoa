import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { getUsers } from '@/lib/users';
import { getAuthorStatsMap } from '@/lib/author-stats';
import {
  AVATAR_FRAME_OPTIONS,
  getAvatarFrameTier,
  getCultivationRealm,
} from '@/lib/author-center/author-center';
import { AUTO_CREATOR_STAGE_INDEX } from '@/lib/creator-role-sync';
import AuthorCenterManager from '@/components/admin/AuthorCenterManager';

type PageProps = {
  searchParams?: Promise<{ saved?: string }>;
};

export default async function AdminAuthorCenterPage({ searchParams }: PageProps) {
  const currentUser = await getCurrentUser();

  if (currentUser?.role !== 'ADMIN') {
    redirect('/');
  }

  const users = await getUsers();
  const statsMap = await getAuthorStatsMap(users.map((user) => user.id));
  const rows = users.map((user) => {
      const stats = statsMap.get(user.id) ?? {
        publishedModCount: 0,
        totalDownloads: 0,
        totalReviews: 0,
        totalComments: 0,
        averageRating: 0,
      };
      const realm = getCultivationRealm(stats);

      return {
        id: user.id,
        username: user.name,
        displayName: user.profile?.displayName?.trim() || user.name,
        role: user.role,
        frameTier: getAvatarFrameTier(user),
        realmId: realm.id,
        realmLabel: `${realm.name} · ${realm.phaseName}`,
        isAutoCreatorEligible: realm.stageIndex >= AUTO_CREATOR_STAGE_INDEX,
      };
    });

  const params = await searchParams;

  return (
    <main className="admin-author-center">
      <header className="admin-author-center__header">
        <p className="iv2-kicker">P7.2.1 Author Center Polish</p>
        <h1>Quản lý Tông Sư & phân quyền</h1>
        <p className="author-muted">
          Đạo hữu đạt Trúc Cơ · Sơ kỳ sẽ tự động được thăng thành Tông Sư.
          Admin vẫn có thể cấp quyền sớm và quản lý khung thân phận thủ công.
        </p>
      </header>

      <AuthorCenterManager
        users={rows}
        frameOptions={AVATAR_FRAME_OPTIONS.map(({ id, name }) => ({ id, name }))}
        saved={params?.saved === '1'}
      />
    </main>
  );
}
