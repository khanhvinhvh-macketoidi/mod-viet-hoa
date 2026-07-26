import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { getAuthorStatsMap } from '@/lib/author-stats';
import {
  getCultivationSettings,
  getCultivationView,
} from '@/lib/cultivation';
import {
  getCultivationIntegrityReport,
} from '@/lib/cultivation-service';
import {
  calculateCultivationXpFromLogs,
  getCultivationLogs,
  type CultivationLogType,
} from '@/lib/cultivation-repository';
import {
  getUserDisplayName,
  getUsers,
} from '@/lib/users';
import CultivationAdminCenter from '@/components/admin/CultivationAdminCenter';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Quản trị Tu Vi',
  robots: { index: false, follow: false },
};

type PageProps = {
  searchParams?: Promise<{
    saved?: string;
  }>;
};

const LOG_LABELS: Partial<Record<CultivationLogType, string>> = {
  DAILY_LOGIN: 'Đăng nhập mỗi ngày',
  LOGIN_STREAK_BONUS: 'Thưởng chuỗi đăng nhập',
  COMMENT_CREATED: 'Đăng bình luận',
  COMMENT_DELETED: 'Xóa bình luận',
  REPLY_CREATED: 'Đăng trả lời',
  REPLY_DELETED: 'Xóa trả lời',
  COMMENT_LIKED: 'Bình luận được thích',
  COMMENT_UNLIKED: 'Bỏ thích bình luận',
  COMMENT_HELPFUL: 'Bình luận hữu ích',
  COMMENT_HELPFUL_REMOVED: 'Bỏ đánh dấu hữu ích',
  MOD_VIEWED: 'Xem mod lần đầu',
  MOD_LIKED: 'Mod được yêu thích',
  MOD_UNLIKED: 'Bỏ yêu thích mod',
  REVIEW_CREATED: 'Đăng đánh giá',
  REVIEW_CONTENT_ADDED: 'Thêm nội dung đánh giá',
  REVIEW_CONTENT_REMOVED: 'Xóa nội dung đánh giá',
  REVIEW_DELETED: 'Xóa đánh giá',
  MOD_PUBLISHED: 'Đăng mod',
  MOD_DELETED: 'Xóa mod',
  AVATAR_ADDED: 'Thêm avatar',
  AVATAR_REMOVED: 'Xóa avatar',
  AVATAR_RESTORED: 'Thêm lại avatar',
  BIO_ADDED: 'Thêm tiểu sử',
  BIO_REMOVED: 'Xóa tiểu sử',
  BIO_RESTORED: 'Thêm lại tiểu sử',
  TRANSLATION_FEEDBACK: 'Đóng góp dịch thuật',
  REFERRAL_REWARD: 'Thưởng giới thiệu',
  ADMIN_ADJUSTMENT: 'Điều chỉnh bởi Admin',
};

function getLogLabel(type: CultivationLogType): string {
  return LOG_LABELS[type] ?? type;
}

export default async function AdminCultivationPage({
  searchParams,
}: PageProps) {
  const admin = await getCurrentUser();

  if (admin?.role !== 'ADMIN') {
    redirect('/');
  }

  const [users, logs, settings, integrity, params] = await Promise.all([
    getUsers(),
    getCultivationLogs(),
    getCultivationSettings(),
    getCultivationIntegrityReport(),
    searchParams,
  ]);

  const statsMap = await getAuthorStatsMap(users.map((user) => user.id));
  const mismatchByUser = new Map(
    integrity.mismatches.map((item) => [item.userId, item]),
  );

  const sortedLogs = [...logs].sort((left, right) =>
    right.createdAt.localeCompare(left.createdAt),
  );

  const logCountByUser = new Map<string, number>();
  const lastActivityByUser = new Map<string, string>();

  for (const log of sortedLogs) {
    logCountByUser.set(
      log.userId,
      (logCountByUser.get(log.userId) ?? 0) + 1,
    );

    if (!lastActivityByUser.has(log.userId)) {
      lastActivityByUser.set(log.userId, log.createdAt);
    }
  }

  const userById = new Map(users.map((user) => [user.id, user]));

  const userRows = users
    .map((user) => {
      const stats = statsMap.get(user.id) ?? {
        publishedModCount: 0,
        totalDownloads: 0,
        totalReviews: 0,
        totalComments: 0,
        averageRating: 0,
      };
      const view = getCultivationView(user, stats, settings);
      const storedTotalXp = Math.max(
        0,
        Math.round(
          Number(
            user.cultivation?.totalXp ??
              user.cultivation?.realmXp ??
              0,
          ) || 0,
        ),
      );
      const ledgerTotalXp = calculateCultivationXpFromLogs(logs, user.id);
      const mismatch = mismatchByUser.get(user.id);

      return {
        id: user.id,
        username: user.name,
        displayName: getUserDisplayName(user),
        role: user.role,
        profileSlug: user.profileSlug,
        createdAt: user.createdAt,
        totalXp: view.totalXp,
        storedTotalXp,
        ledgerTotalXp,
        delta: mismatch?.delta ?? 0,
        realmId: view.realm.id,
        realmName: view.realm.name,
        phase: view.phase,
        phaseName: view.phaseName,
        realmXp: view.realmXp,
        requiredXp: view.requiredXp,
        overallProgress: view.overallProgress,
        phaseProgress: view.phaseProgress,
        streak: user.cultivation?.login?.streak ?? 0,
        lastRewardDate: user.cultivation?.login?.lastRewardDate,
        logCount: logCountByUser.get(user.id) ?? 0,
        lastActivityAt: lastActivityByUser.get(user.id),
        isLegacyPreview: view.isLegacyPreview,
      };
    })
    .sort((left, right) => {
      if (left.delta !== 0 && right.delta === 0) return -1;
      if (left.delta === 0 && right.delta !== 0) return 1;
      return right.totalXp - left.totalXp;
    });

  const latestLogs = sortedLogs.slice(0, 1_000).map((log) => {
    const user = userById.get(log.userId);
    const reason =
      typeof log.metadata?.reason === 'string'
        ? log.metadata.reason
        : undefined;

    return {
      id: log.id,
      userId: log.userId,
      username: user?.name ?? 'unknown',
      displayName: user ? getUserDisplayName(user) : 'Tài khoản không còn tồn tại',
      type: log.type,
      typeLabel: getLogLabel(log.type),
      points: Number(log.points || 0),
      targetId: log.targetId,
      uniqueKey: log.uniqueKey,
      createdAt: log.createdAt,
      reversedAt: log.reversedAt,
      reason,
      metadata: log.metadata ?? {},
    };
  });

  const ledgerTotalXp = users.reduce(
    (sum, user) => sum + calculateCultivationXpFromLogs(logs, user.id),
    0,
  );

  return (
    <CultivationAdminCenter
      currentAdminId={admin.id}
      users={userRows}
      logs={latestLogs}
      logTypeOptions={Object.entries(LOG_LABELS).map(([id, label]) => ({
        id,
        label: label ?? id,
      }))}
      summary={{
        totalUsers: users.length,
        totalXp: ledgerTotalXp,
        totalLedgerEntries: logs.length,
        activeGrants: logs.filter(
          (log) => log.points > 0 && !log.reversedAt,
        ).length,
        reversalEntries: logs.filter((log) => log.points < 0).length,
        adminAdjustments: logs.filter(
          (log) => log.type === 'ADMIN_ADJUSTMENT',
        ).length,
        mismatchCount: integrity.mismatches.length,
        visibleLogCount: latestLogs.length,
      }}
      settings={{
        earlyPhasePercent: settings.earlyPhasePercent,
        middlePhasePercent: settings.middlePhasePercent,
        updatedAt: settings.updatedAt,
        realms: settings.realms.map((realm) => ({
          id: realm.id,
          name: realm.name,
          requiredXp: realm.requiredXp,
          phaseCount: realm.phaseCount ?? 3,
        })),
      }}
      settingsSaved={params?.saved === 'settings'}
    />
  );
}
