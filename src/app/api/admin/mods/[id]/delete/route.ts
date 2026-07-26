import fs from 'node:fs/promises';
import path from 'node:path';
import { NextResponse } from 'next/server';

import { getCurrentUser } from '@/lib/auth';
import { canManageMod } from '@/lib/permissions';
import { resolveManagedMediaUrl } from '@/lib/media-storage';
import {
  getModById,
  getMods,
  saveMods,
} from '@/lib/store';
import {
  getModFavorites,
  saveModFavorites,
} from '@/lib/favorites';
import {
  grantCultivation,
  rewardModPublished,
  revokeCultivation,
  revokeModPublished,
} from '@/lib/cultivation-service';
import { getCultivationLogs } from '@/lib/cultivation-repository';
import {
  rewardModApprovedReputation,
  revokeModApprovedReputation,
} from '@/lib/reputation-service';

async function removeFileIfExists(filePath: string): Promise<void> {
  try {
    await fs.unlink(filePath);
  } catch {
    // Không làm thao tác xóa thất bại nếu file đã không tồn tại.
  }
}

async function runCompensations(
  compensations: Array<() => Promise<unknown>>,
): Promise<void> {
  const pending = compensations.splice(0).reverse();
  await Promise.allSettled(pending.map((compensate) => compensate()));
}

export async function POST(
  request: Request,
  {
    params,
  }: {
    params: Promise<{
      id: string;
    }>;
  },
) {
  const user = await getCurrentUser();

  if (!user) {
    return new Response('Unauthorized', { status: 401 });
  }

  const { id } = await params;
  const mod = await getModById(id);

  if (!mod) {
    return NextResponse.redirect(
      new URL(
        user.role === 'ADMIN'
          ? '/admin/mods?error=1'
          : '/creator/mods?error=1',
        request.url,
      ),
      303,
    );
  }

  if (!canManageMod(user, mod)) {
    return new Response('Forbidden', { status: 403 });
  }

  const destination = (state: 'deleted' | 'error') =>
    new URL(
      user.role === 'ADMIN'
        ? `/admin/mods?${state}=1`
        : `/creator/mods?${state}=1`,
      request.url,
    );

  const compensations: Array<() => Promise<unknown>> = [];
  let dataCommitted = false;

  try {
    const [mods, favorites, cultivationLogs] = await Promise.all([
      getMods(),
      getModFavorites(),
      getCultivationLogs(),
    ]);

    const remainingMods = mods.filter((item) => item.id !== id);
    const remainingFavorites = favorites.filter(
      (item) => item.modId !== id,
    );

    if (mod.authorId) {
      const publishReversal = await revokeModPublished(
        mod.authorId,
        mod.id,
      );

      if (publishReversal.reversed) {
        compensations.push(() =>
          rewardModPublished(mod.authorId!, mod.id),
        );
      }

      const reputationReversal =
        await revokeModApprovedReputation(mod.authorId, mod.id);

      if (reputationReversal.reversed) {
        compensations.push(() =>
          rewardModApprovedReputation(mod.authorId!, mod.id),
        );
      }

      const activeLikeLogs = cultivationLogs.filter(
        (log) =>
          log.userId === mod.authorId &&
          log.targetId === mod.id &&
          log.type === 'MOD_LIKED' &&
          !log.reversedAt &&
          Boolean(log.uniqueKey),
      );

      for (const likeLog of activeLikeLogs) {
        const points = Math.max(0, Number(likeLog.points || 0));
        if (!likeLog.uniqueKey || points <= 0) continue;

        const likeReversal = await revokeCultivation({
          userId: likeLog.userId,
          uniqueKey: likeLog.uniqueKey,
          type: 'MOD_UNLIKED',
          points,
          targetId: mod.id,
          metadata: likeLog.metadata,
        });

        if (likeReversal.reversed) {
          compensations.push(() =>
            grantCultivation({
              userId: likeLog.userId,
              type: 'MOD_LIKED',
              points,
              targetId: mod.id,
              uniqueKey: likeLog.uniqueKey,
              metadata: likeLog.metadata,
            }),
          );
        }
      }
    }

    try {
      await saveMods(remainingMods);
      await saveModFavorites(remainingFavorites);
      dataCommitted = true;
    } catch (dataError) {
      await Promise.allSettled([
        saveMods(mods),
        saveModFavorites(favorites),
      ]);
      await runCompensations(compensations);
      throw dataError;
    }

    const modFilePath = path.join(
      process.cwd(),
      'storage',
      'uploads',
      mod.storedFileName,
    );

    await removeFileIfExists(modFilePath);

    const managedMediaUrls = [
      mod.coverUrl,
      ...(Array.isArray(mod.galleryUrls) ? mod.galleryUrls : []),
    ];

    await Promise.all(
      managedMediaUrls.map(async (url) => {
        const filePath = resolveManagedMediaUrl(url);

        if (filePath) {
          await removeFileIfExists(filePath);
        }
      }),
    );

    return NextResponse.redirect(destination('deleted'), 303);
  } catch (error) {
    // If a reward reversal failed before the mod data changed, restore any
    // earlier reversals collected in this request.
    if (!dataCommitted) {
      await runCompensations(compensations);
    }
    console.error('Lỗi xóa mod:', error);

    return NextResponse.redirect(destination('error'), 303);
  }
}
