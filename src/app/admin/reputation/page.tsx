import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { getUserDisplayName, getUsers } from '@/lib/users';
import {
  calculateReputationPointsFromLogs,
  getReputationLogs,
  type ReputationLogType,
} from '@/lib/reputation-repository';
import {
  getReputationSettings,
  getReputationView,
} from '@/lib/reputation';
import { getReputationIntegrityReport } from '@/lib/reputation-service';
import ReputationAdminCenter from '@/components/admin/ReputationAdminCenter';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Quản trị Danh vọng',
  robots: { index: false, follow: false },
};

const LOG_LABELS: Partial<Record<ReputationLogType, string>> = {
  COMMENT_HELPFUL: 'Bình luận hữu ích',
  COMMENT_HELPFUL_REMOVED: 'Bỏ Danh vọng bình luận hữu ích',
  REVIEW_HELPFUL: 'Đánh giá hữu ích',
  REVIEW_HELPFUL_REMOVED: 'Bỏ Danh vọng đánh giá hữu ích',
  MOD_APPROVED: 'Mod được công khai',
  MOD_REMOVED: 'Mod bị gỡ',
  REPORT_ACCEPTED: 'Báo cáo được chấp nhận',
  MOD_RATING_MILESTONE: 'Mốc đánh giá mod',
  MOD_FAVORITE_MILESTONE: 'Mốc yêu thích mod',
  TRANSLATION_ACCEPTED: 'Đóng góp dịch thuật',
  GUIDE_APPROVED: 'Hướng dẫn được duyệt',
  PENALTY: 'Xử phạt Danh vọng',
  ADMIN_ADJUSTMENT: 'Điều chỉnh bởi Admin',
};

export default async function AdminReputationPage() {
  const admin = await getCurrentUser();
  if (admin?.role !== 'ADMIN') {
    redirect('/');
  }

  const [users, logs, settings, integrity] = await Promise.all([
    getUsers(),
    getReputationLogs(),
    getReputationSettings(),
    getReputationIntegrityReport(),
  ]);

  const mismatchByUser = new Map(
    integrity.mismatches.map((item) => [item.userId, item]),
  );
  const sortedLogs = [...logs].sort((left, right) =>
    right.createdAt.localeCompare(left.createdAt),
  );
  const userById = new Map(users.map((user) => [user.id, user]));
  const logCountByUser = new Map<string, number>();

  for (const log of logs) {
    logCountByUser.set(
      log.userId,
      (logCountByUser.get(log.userId) ?? 0) + 1,
    );
  }

  const userRows = users
    .map((user) => {
      const view = getReputationView(user, settings);
      const storedTotalPoints = Math.max(
        0,
        Math.round(Number(user.reputation?.totalPoints) || 0),
      );
      const ledgerTotalPoints = calculateReputationPointsFromLogs(
        logs,
        user.id,
      );
      const mismatch = mismatchByUser.get(user.id);

      return {
        id: user.id,
        username: user.name,
        displayName: getUserDisplayName(user),
        role: user.role,
        profileSlug: user.profileSlug,
        totalPoints: view.totalPoints,
        storedTotalPoints,
        ledgerTotalPoints,
        delta: mismatch?.delta ?? 0,
        tierId: view.tier.id,
        tierName: view.tier.name,
        tierColor: view.tier.color,
        tierClassName: view.tier.className,
        status: view.status,
        logCount: logCountByUser.get(user.id) ?? 0,
      };
    })
    .sort((left, right) => {
      if (left.delta !== 0 && right.delta === 0) return -1;
      if (left.delta === 0 && right.delta !== 0) return 1;
      return right.totalPoints - left.totalPoints;
    });

  const latestLogs = sortedLogs.slice(0, 1_000).map((log) => {
    const user = userById.get(log.userId);
    return {
      id: log.id,
      userId: log.userId,
      username: user?.name ?? 'unknown',
      displayName: user ? getUserDisplayName(user) : 'Tài khoản không còn tồn tại',
      type: log.type,
      typeLabel: LOG_LABELS[log.type] ?? log.type,
      points: Number(log.points || 0),
      targetId: log.targetId,
      uniqueKey: log.uniqueKey,
      createdAt: log.createdAt,
      reversedAt: log.reversedAt,
      reason:
        typeof log.metadata?.reason === 'string'
          ? log.metadata.reason
          : undefined,
    };
  });

  return (
    <ReputationAdminCenter
      currentAdminId={admin!.id}
      users={userRows}
      logs={latestLogs}
      logTypeOptions={Object.entries(LOG_LABELS).map(([id, label]) => ({
        id,
        label: label ?? id,
      }))}
      tiers={settings.tiers.map((tier) => ({
        id: tier.id,
        name: tier.name,
        minPoints: tier.minPoints,
        color: tier.color,
        className: tier.className,
      }))}
      summary={{
        totalUsers: users.length,
        totalPoints: users.reduce(
          (sum, user) =>
            sum + calculateReputationPointsFromLogs(logs, user.id),
          0,
        ),
        totalLedgerEntries: logs.length,
        frozenUsers: users.filter(
          (user) => user.reputation?.status === 'FROZEN',
        ).length,
        mismatchCount: integrity.mismatches.length,
      }}
    />
  );
}
