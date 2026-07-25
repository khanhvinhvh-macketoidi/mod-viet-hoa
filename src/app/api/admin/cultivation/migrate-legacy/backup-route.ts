import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getAuthorStats } from '@/lib/author-stats';
import { calculateLegacyCultivationXp } from '@/lib/cultivation';
import { grantCultivation } from '@/lib/cultivation-service';
import { getUserById, getUsers } from '@/lib/users';

export const dynamic = 'force-dynamic';

type MigrationRequest = {
  /**
   * Mặc định chỉ di chuyển XP cho tài khoản đang đăng nhập.
   * Chỉ ADMIN mới được phép đặt allUsers = true.
   */
  allUsers?: boolean;

  /**
   * ADMIN có thể di chuyển cho một tài khoản cụ thể.
   * Khi bỏ trống, endpoint dùng tài khoản đang đăng nhập.
   */
  userId?: string;
};

type MigrationResult = {
  userId: string;
  legacyXp: number;
  granted: boolean;
  reason?: string;
};

/**
 * Di chuyển một lần XP của hệ thống cũ sang hệ thống cultivation mới.
 *
 * XP mới được cộng thêm vào totalXp hiện có. Ví dụ:
 * - XP cũ: 5.027
 * - XP hoạt động mới đang có: 5
 * - totalXp sau di chuyển: 5.032
 *
 * uniqueKey bảo đảm gọi endpoint nhiều lần cũng không cộng trùng.
 */
export async function POST(request: Request) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return NextResponse.json(
      { ok: false, error: 'Bạn chưa đăng nhập.' },
      { status: 401 },
    );
  }

  let body: MigrationRequest = {};

  try {
    body = (await request.json()) as MigrationRequest;
  } catch {
    // Cho phép POST không có body.
  }

  if (currentUser.role !== 'ADMIN') {
    return NextResponse.json(
      {
        ok: false,
        error: 'Chỉ ADMIN được phép chạy migration XP legacy.',
      },
      { status: 403 },
    );
  }

  const targets = body.allUsers
    ? await getUsers()
    : [
        await getUserById(
          body.userId?.trim() || currentUser.id,
        ),
      ].filter((user): user is NonNullable<typeof user> => Boolean(user));

  if (targets.length === 0) {
    return NextResponse.json(
      { ok: false, error: 'Không tìm thấy tài khoản cần di chuyển.' },
      { status: 404 },
    );
  }

  const results: MigrationResult[] = [];

  for (const user of targets) {
    const stats = await getAuthorStats(user.id);
    const legacyXp = calculateLegacyCultivationXp(stats);

    if (legacyXp <= 0) {
      results.push({
        userId: user.id,
        legacyXp: 0,
        granted: false,
        reason: 'Tài khoản không có XP legacy để di chuyển.',
      });
      continue;
    }

    const migration = await grantCultivation({
      userId: user.id,
      type: 'ADMIN_ADJUSTMENT',
      points: legacyXp,
      uniqueKey: `LEGACY_CULTIVATION_MIGRATION:${user.id}`,
      metadata: {
        reason: 'Migrate legacy stats-based cultivation XP',
        legacyXp,
        migratedBy: currentUser.id,
      },
    });

    results.push({
      userId: user.id,
      legacyXp,
      granted: migration.granted,
      reason: migration.granted
        ? undefined
        : 'XP legacy của tài khoản này đã được di chuyển trước đó.',
    });
  }

  const migratedCount = results.filter((item) => item.granted).length;
  const migratedXp = results
    .filter((item) => item.granted)
    .reduce((sum, item) => sum + item.legacyXp, 0);

  return NextResponse.json({
    ok: true,
    requestedCount: targets.length,
    migratedCount,
    migratedXp,
    results,
  });
}
