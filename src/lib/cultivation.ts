import 'server-only';

import path from 'node:path';
import type {
  AuthorStats,
  CultivationProgress,
  CultivationRealmId,
  PublicUserProfile,
  User,
} from './types';
import { dataDir } from './data-paths';
import { readJson, writeJson } from './json-store';


export type CultivationPhaseId = 'SO_KY' | 'TRUNG_KY' | 'HAU_KY';

export type CultivationRealmSetting = {
  id: CultivationRealmId;
  name: string;
  requiredXp: number;
  className: string;
  phaseCount?: 2 | 3;
  earlyPhasePercentOverride?: number;
};

export type CultivationSettings = {
  version: number;
  earlyPhasePercent: number;
  middlePhasePercent: number;
  realms: CultivationRealmSetting[];
  updatedAt: string;
};

export type CultivationView = {
  realm: CultivationRealmSetting;
  phase: CultivationPhaseId;
  phaseName: string;
  realmXp: number;
  totalXp: number;
  requiredXp: number;
  overallProgress: number;
  phaseProgress: number;
  phaseStartXp: number;
  phaseEndXp: number;
  isLateStage: boolean;
  isRealmComplete: boolean;
  isLegacyPreview: boolean;
};

export const cultivationSettingsPath = path.join(
  dataDir,
  'cultivation-settings.json',
);

export const DEFAULT_CULTIVATION_SETTINGS: CultivationSettings = {
  version: 2,

  // Luyện Khí:
  // 0 XP       -> Sơ kỳ
  // 260 XP     -> Trung kỳ
  // 1600 XP    -> Hậu kỳ
  // 2346 XP    -> Phá cảnh -> Trúc Cơ Sơ kỳ, XP trong cảnh giới reset về 0
  earlyPhasePercent: (260 / 2346) * 100,
  middlePhasePercent: (1600 / 2346) * 100,

  realms: [
    {
      id: 'LUYEN_KHI',
      name: 'Luyện Khí',
      requiredXp: 2346,
      className: 'realm-luyen-khi',
    },
    {
      id: 'TRUC_CO',
      name: 'Trúc Cơ',
      requiredXp: 5976,
      className: 'realm-truc-co',
    },
    {
      id: 'KET_TINH',
      name: 'Kết Tinh',
      requiredXp: 11520,
      className: 'realm-ket-tinh',
    },
    {
      id: 'KIM_DAN',
      name: 'Kim Đan',
      requiredXp: 29952,
      className: 'realm-kim-dan',
    },
    {
      id: 'CU_LINH',
      name: 'Cụ Linh',
      requiredXp: 58407,
      className: 'realm-cu-linh',
    },
    {
      id: 'NGUYEN_ANH',
      name: 'Nguyên Anh',
      requiredXp: 121604,
      className: 'realm-nguyen-anh',
    },
    {
      id: 'HOA_THAN',
      name: 'Hóa Thần',
      requiredXp: 308405,
      className: 'realm-hoa-than',
    },
    {
      id: 'NGO_DAO',
      name: 'Ngộ Đạo',
      requiredXp: 552039,
      className: 'realm-ngo-dao',
    },
    {
      id: 'VU_HOA',
      name: 'Vũ Hóa',
      requiredXp: 1167701,
      className: 'realm-vu-hoa',
    },
    {
      id: 'DANG_TIEN',
      name: 'Đăng Tiên',
      requiredXp: 1844807,
      className: 'realm-dang-tien',
      phaseCount: 2,
      earlyPhasePercentOverride: (790632 / 1844807) * 100,
    },
  ],

  updatedAt: new Date(0).toISOString(),
};

function clampNumber(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export async function getCultivationSettings(): Promise<CultivationSettings> {
  const current = await readJson<CultivationSettings>(
    cultivationSettingsPath,
    DEFAULT_CULTIVATION_SETTINGS,
  );


  const early = clampNumber(
    Number(current.earlyPhasePercent) ||
      DEFAULT_CULTIVATION_SETTINGS.earlyPhasePercent,
    1,
    98,
  );

  const middle = clampNumber(
    Number(current.middlePhasePercent) ||
      DEFAULT_CULTIVATION_SETTINGS.middlePhasePercent,
    early + 0.0001,
    99,
  );

  const byId = new Map(
    current.realms?.map((item) => [item.id, item]) ?? [],
  );

  return {
    version: 2,
    earlyPhasePercent: early,
    middlePhasePercent: middle,

    realms: DEFAULT_CULTIVATION_SETTINGS.realms.map((fallback) => {
      const configured = byId.get(fallback.id);

      return {
        ...fallback,
        ...configured,

        requiredXp: Math.max(
          1,
          Math.round(
            Number(configured?.requiredXp) || fallback.requiredXp,
          ),
        ),

        phaseCount:
          fallback.phaseCount ??
          configured?.phaseCount ??
          3,

        earlyPhasePercentOverride:
          fallback.earlyPhasePercentOverride ??
          configured?.earlyPhasePercentOverride,
      };
    }),

    updatedAt:
      current.updatedAt ||
      new Date().toISOString(),
  };
}

export async function saveCultivationSettings(
  settings: CultivationSettings,
): Promise<void> {
  await writeJson(cultivationSettingsPath, {
    ...settings,
    updatedAt: new Date().toISOString(),
  });
}

export function calculateLegacyCultivationXp(
  stats: AuthorStats,
): number {
  const ratingBonus =
    stats.totalReviews > 0
      ? Math.round(
          stats.averageRating *
            stats.totalReviews *
            18,
        )
      : 0;

  return Math.max(
    0,
    stats.publishedModCount * 600 +
      stats.totalDownloads +
      stats.totalReviews * 90 +
      stats.totalComments * 32 +
      ratingBonus,
  );
}

export function normalizeCultivationProgress(
  progress: CultivationProgress | undefined,
  settings: CultivationSettings,
): CultivationProgress {
  const realm =
    settings.realms.find(
      (item) => item.id === progress?.realmId,
    ) ?? settings.realms[0];

  if (!realm) {
    throw new Error(
      'Cultivation settings must contain at least one realm.',
    );
  }

  const totalXp = Math.max(
    0,
    Math.round(
      Number(
        progress?.totalXp ??
          progress?.realmXp,
      ) || 0,
    ),
  );

  return {
    realmId: realm.id,

    // realmXp is the XP shown inside the currently stored realm.
    realmXp: clampNumber(
      Math.round(
        Number(progress?.realmXp) || totalXp,
      ),
      0,
      realm.requiredXp,
    ),

    totalXp,

    breakthroughStatus:
      progress?.breakthroughStatus ??
      'CULTIVATING',

    completedQuestIds:
      Array.isArray(
        progress?.completedQuestIds,
      )
        ? progress.completedQuestIds.filter(
            (
              item,
            ): item is string =>
              typeof item === 'string',
          )
        : [],

    updatedAt:
      progress?.updatedAt ??
      new Date().toISOString(),

    login: progress?.login,
  };
}

/**
 * Tính cảnh giới theo XP tích lũy toàn tài khoản.
 *
 * Quy tắc:
 *
 * Ví dụ:
 *   Luyện Khí cần 2346 XP.
 *
 *   totalXp = 0
 *     -> Luyện Khí, realmXp = 0
 *     -> Sơ kỳ
 *
 *   totalXp = 260
 *     -> Luyện Khí, realmXp = 260
 *     -> Trung kỳ
 *
 *   totalXp = 1600
 *     -> Luyện Khí, realmXp = 1600
 *     -> Hậu kỳ
 *
 *   totalXp = 2346
 *     -> Trúc Cơ, realmXp = 0
 *     -> Sơ kỳ
 *
 *   totalXp = 2346 + 260
 *     -> Trúc Cơ, realmXp = 260
 *     -> Trung kỳ
 *
 * XP dùng để xác định cảnh giới là XP tích lũy toàn tài khoản.
 * XP hiển thị trong cảnh giới hiện tại luôn được reset về 0
 * sau khi phá cảnh.
 */
export function getCultivationView(
  user: User | PublicUserProfile,
  stats: AuthorStats,
  settings: CultivationSettings,
): CultivationView {
  const stored = user.cultivation;
  /**
   * XP legacy chỉ dùng khi user chưa có dữ liệu cultivation riêng.
   */
  const legacyXp = calculateLegacyCultivationXp(stats);

  /**
   * XP tổng tích lũy của tài khoản.
   *
   * Ví dụ:
   * 0 -> Luyện Khí Sơ kỳ
   * 260 -> Luyện Khí Trung kỳ
   * 1600 -> Luyện Khí Hậu kỳ
   * 2346 -> Trúc Cơ Sơ kỳ, realmXp = 0
   */
  const totalXp = stored
  ? Math.max(0, Math.round(Number(stored.totalXp) || 0))
  : Math.max(0, legacyXp);

  /**
   * Xác định cảnh giới hiện tại.
   *
   * requiredXp là lượng XP cần để phá cảnh giới đó.
   *
   * Ví dụ:
   *
   * Luyện Khí: 2346 XP
   * Trúc Cơ:   5976 XP
   *
   * totalXp = 260
   *   => Luyện Khí, realmXp = 260
   *
   * totalXp = 1600
   *   => Luyện Khí, realmXp = 1600
   *
   * totalXp = 2346
   *   => Trúc Cơ, realmXp = 0
   *
   * totalXp = 2600
   *   => Trúc Cơ, realmXp = 254
   */
  let realm = settings.realms[0];
  let realmXp = totalXp;

  if (!realm) {
    throw new Error(
      'Cultivation settings must contain at least one realm.',
    );
  }

  let cumulativeXp = 0;

  for (let index = 0; index < settings.realms.length; index += 1) {
    const candidate = settings.realms[index];

    if (!candidate) {
      continue;
    }

    const candidateEndXp =
      cumulativeXp + candidate.requiredXp;

    /**
     * XP vẫn nằm trong cảnh giới hiện tại.
     */
    if (totalXp < candidateEndXp) {
      realm = candidate;
      realmXp = totalXp - cumulativeXp;
      break;
    }

    /**
     * Nếu đã phá cảnh giới cuối cùng,
     * giữ ở cảnh giới cuối và giới hạn XP tối đa.
     */
    if (index === settings.realms.length - 1) {
      realm = candidate;
      realmXp = candidate.requiredXp;
      break;
    }

    /**
     * Đã phá cảnh giới này.
     * Chuyển sang cảnh giới kế tiếp.
     */
    cumulativeXp = candidateEndXp;
  }

  /**
   * Đảm bảo XP trong cảnh giới luôn hợp lệ.
   */
  realmXp = clampNumber(
    Math.round(realmXp),
    0,
    realm.requiredXp,
  );

  const requiredXp = realm.requiredXp;
  const phaseCount = realm.phaseCount ?? 3;

  /**
   * Xác định mốc Trung kỳ.
   *
   * Với Luyện Khí mặc định:
   *
   * requiredXp = 2346
   * earlyPhasePercent = 33.3333%
   *
   * 2346 * 33.3333% ≈ 782 XP
   *
   * Tuy nhiên nếu hệ thống của bạn muốn:
   *
   * Sơ kỳ:    0 -> 259
   * Trung kỳ: 260 -> 1599
   * Hậu kỳ:   1600 -> 2345
   *
   * thì cần cấu hình earlyPhasePercent tương ứng.
   */
  const earlyPercent =
    realm.earlyPhasePercentOverride ??
    settings.earlyPhasePercent;

  const middlePercent =
    phaseCount === 2
      ? 100
      : settings.middlePhasePercent;

  const earlyEnd = clampNumber(
    Math.round(
      requiredXp * (earlyPercent / 100),
    ),
    0,
    requiredXp,
  );

  const middleEnd = clampNumber(
    Math.round(
      requiredXp * (middlePercent / 100),
    ),
    earlyEnd,
    requiredXp,
  );

  let phase: CultivationPhaseId = 'SO_KY';
  let phaseName = 'Sơ kỳ';
  let phaseStartXp = 0;
  let phaseEndXp = earlyEnd;

  /**
   * Cảnh giới 2 giai đoạn:
   *
   * Sơ kỳ -> Hậu kỳ
   */
  if (phaseCount === 2) {
    if (realmXp >= earlyEnd) {
      phase = 'HAU_KY';
      phaseName = 'Hậu kỳ';
      phaseStartXp = earlyEnd;
      phaseEndXp = requiredXp;
    }
  }

  /**
   * Cảnh giới 3 giai đoạn:
   *
   * Sơ kỳ -> Trung kỳ -> Hậu kỳ
   */
  else if (realmXp >= middleEnd) {
    phase = 'HAU_KY';
    phaseName = 'Hậu kỳ';
    phaseStartXp = middleEnd;
    phaseEndXp = requiredXp;
  } else if (realmXp >= earlyEnd) {
    phase = 'TRUNG_KY';
    phaseName = 'Trung kỳ';
    phaseStartXp = earlyEnd;
    phaseEndXp = middleEnd;
  }

  /**
   * Tiến độ toàn cảnh giới.
   */
  const overallProgress =
    requiredXp > 0
      ? clampNumber(
          Math.round(
            (realmXp / requiredXp) * 100,
          ),
          0,
          100,
        )
      : 0;

  /**
   * Tiến độ giai đoạn hiện tại.
   */
  const phaseRange =
    phaseEndXp - phaseStartXp;

  const phaseProgress =
    phaseRange > 0
      ? clampNumber(
          Math.round(
            (
              (realmXp - phaseStartXp) /
              phaseRange
            ) * 100,
          ),
          0,
          100,
        )
      : 100;

  return {
    realm,
    phase,
    phaseName,

    // XP đã reset trong cảnh giới hiện tại.
    realmXp,

    // XP tích lũy toàn tài khoản.
    totalXp,

    requiredXp,

    overallProgress,
    phaseProgress,

    phaseStartXp,
    phaseEndXp,

    isLateStage:
      phase === 'HAU_KY',

    isRealmComplete:
      realmXp >= requiredXp,

    isLegacyPreview:
      !stored,
  };
}
