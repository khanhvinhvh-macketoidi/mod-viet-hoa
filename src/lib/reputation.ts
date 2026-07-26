import 'server-only';

import path from 'node:path';
import type {
  PublicUserProfile,
  ReputationProgress,
  ReputationTierId,
  User,
} from './types';
import { dataDir } from './data-paths';
import { readJson, writeJson } from './json-store';

export type ReputationEffect =
  | 'NONE'
  | 'GREEN_GLOW'
  | 'GREEN_SPARK'
  | 'BLUE_GLOW'
  | 'BLUE_SPARK'
  | 'GOLD_GLOW'
  | 'GOLD_SPARK'
  | 'PURPLE_MIST'
  | 'PURPLE_GLOW'
  | 'MAGENTA_SPARK'
  | 'ORANGE_EMBER'
  | 'ORANGE_FLAME'
  | 'RED_FLAME'
  | 'CRIMSON_RUNE'
  | 'CRIMSON_FIRE'
  | 'IMMORTAL_FLAME';

export type ReputationTierSetting = {
  id: ReputationTierId;
  name: string;
  minPoints: number;
  color: string;
  effect: ReputationEffect;
  className: string;
};

export type ReputationSettings = {
  version: number;
  tiers: ReputationTierSetting[];
  updatedAt: string;
};

export type ReputationView = {
  totalPoints: number;
  status: ReputationProgress['status'];
  tier: ReputationTierSetting;
  tierIndex: number;
  isHighestTier: boolean;
};

export const reputationSettingsPath = path.join(
  dataDir,
  'reputation-settings.json',
);

export const DEFAULT_REPUTATION_SETTINGS: ReputationSettings = {
  version: 1,
  tiers: [
    {
      id: 'KHONG_CHUT_TIENG_TAM',
      name: 'Không chút tiếng tăm',
      minPoints: 0,
      color: '#7b8794',
      effect: 'NONE',
      className: 'reputation-none',
    },
    {
      id: 'SO_LO_PHONG_MANG',
      name: 'Sơ lộ phong mang',
      minPoints: 200,
      color: '#006000',
      effect: 'GREEN_GLOW',
      className: 'reputation-green-glow',
    },
    {
      id: 'BOC_LO_TAI_NANG',
      name: 'Bộc lộ tài năng',
      minPoints: 500,
      color: '#00cc00',
      effect: 'GREEN_SPARK',
      className: 'reputation-green-spark',
    },
    {
      id: 'DANH_CHAN_NHAT_THOI',
      name: 'Danh chấn nhất thời',
      minPoints: 1000,
      color: '#0030ff',
      effect: 'BLUE_GLOW',
      className: 'reputation-blue-glow',
    },
    {
      id: 'TIENG_TAM_LAY_LUNG',
      name: 'Tiếng tăm lẫy lừng',
      minPoints: 1600,
      color: '#0060ff',
      effect: 'BLUE_SPARK',
      className: 'reputation-blue-spark',
    },
    {
      id: 'KINH_THIEN_DONG_DIA',
      name: 'Kinh thiên động địa',
      minPoints: 2300,
      color: '#ffcc00',
      effect: 'GOLD_GLOW',
      className: 'reputation-gold-glow',
    },
    {
      id: 'DAI_DANH_DINH_DINH',
      name: 'Đại danh đỉnh đỉnh',
      minPoints: 3000,
      color: '#ffff00',
      effect: 'GOLD_SPARK',
      className: 'reputation-gold-spark',
    },
    {
      id: 'THANH_DANH_VANG_DOI',
      name: 'Thanh danh vang dội',
      minPoints: 3800,
      color: '#7f007f',
      effect: 'PURPLE_MIST',
      className: 'reputation-purple-mist',
    },
    {
      id: 'DANH_CHAN_THIEN_HA',
      name: 'Danh chấn thiên hạ',
      minPoints: 4700,
      color: '#bf00bf',
      effect: 'PURPLE_GLOW',
      className: 'reputation-purple-glow',
    },
    {
      id: 'CU_THE_VAN_DANH',
      name: 'Cử thế văn danh',
      minPoints: 5800,
      color: '#ff00ff',
      effect: 'MAGENTA_SPARK',
      className: 'reputation-magenta-spark',
    },
    {
      id: 'CHAN_NHIEP_QUAN_HUNG',
      name: 'Chấn nhiếp quần hùng',
      minPoints: 7000,
      color: '#ff8800',
      effect: 'ORANGE_EMBER',
      className: 'reputation-orange-ember',
    },
    {
      id: 'VANG_DOI_BAT_HOANG',
      name: 'Vang dội bát hoang',
      minPoints: 8300,
      color: '#ff6600',
      effect: 'ORANGE_FLAME',
      className: 'reputation-orange-flame',
    },
    {
      id: 'UY_CHAN_BAT_HOANG',
      name: 'Uy chấn bát hoang',
      minPoints: 9700,
      color: '#ff4400',
      effect: 'RED_FLAME',
      className: 'reputation-red-flame',
    },
    {
      id: 'LUU_DANH_TIEN_GIOI',
      name: 'Lưu danh tiên giới',
      minPoints: 11300,
      color: '#9f0000',
      effect: 'CRIMSON_RUNE',
      className: 'reputation-crimson-rune',
    },
    {
      id: 'LUNG_DANH_TAM_GIOI',
      name: 'Lừng danh tam giới',
      minPoints: 12800,
      color: '#cf0000',
      effect: 'CRIMSON_FIRE',
      className: 'reputation-crimson-fire',
    },
    {
      id: 'UY_CHAN_TAM_GIOI',
      name: 'Uy chấn tam giới',
      minPoints: 15000,
      color: '#ff0000',
      effect: 'IMMORTAL_FLAME',
      className: 'reputation-immortal-flame',
    },
  ],
  updatedAt: new Date(0).toISOString(),
};

function normalizeHexColor(value: unknown, fallback: string): string {
  const text = String(value ?? '').trim();
  return /^#[0-9a-f]{6}$/i.test(text) ? text.toLowerCase() : fallback;
}

function normalizeSettings(current: ReputationSettings): ReputationSettings {
  const configured = new Map(
    Array.isArray(current.tiers)
      ? current.tiers.map((tier) => [tier.id, tier])
      : [],
  );

  let previousMin = -1;

  const tiers = DEFAULT_REPUTATION_SETTINGS.tiers.map((fallback) => {
    const tier = configured.get(fallback.id);
    const requestedMin = Math.max(
      0,
      Math.round(Number(tier?.minPoints ?? fallback.minPoints) || 0),
    );
    const minPoints = Math.max(previousMin + 1, requestedMin);
    previousMin = minPoints;

    return {
      ...fallback,
      ...tier,
      id: fallback.id,
      name: String(tier?.name ?? fallback.name).trim() || fallback.name,
      minPoints,
      color: normalizeHexColor(tier?.color, fallback.color),
      effect: fallback.effect,
      className: fallback.className,
    };
  });

  // Cấp đầu tiên luôn bắt đầu từ 0.
  const firstTier = tiers[0];
  if (!firstTier) {
    throw new Error('Reputation settings phải có ít nhất một cấp Danh vọng.');
  }
  tiers[0] = { ...firstTier, minPoints: 0 };

  return {
    version: 1,
    tiers,
    updatedAt: current.updatedAt || new Date().toISOString(),
  };
}

export async function getReputationSettings(): Promise<ReputationSettings> {
  const current = await readJson<ReputationSettings>(
    reputationSettingsPath,
    DEFAULT_REPUTATION_SETTINGS,
  );

  return normalizeSettings(current);
}

export async function saveReputationSettings(
  settings: ReputationSettings,
): Promise<void> {
  const normalized = normalizeSettings(settings);
  await writeJson(reputationSettingsPath, {
    ...normalized,
    updatedAt: new Date().toISOString(),
  });
}

export function getReputationTierByPoints(
  totalPoints: number,
  settings: ReputationSettings,
): ReputationTierSetting {
  const safePoints = Math.max(0, Math.round(Number(totalPoints) || 0));
  const fallbackTier =
    settings.tiers[0] ?? DEFAULT_REPUTATION_SETTINGS.tiers[0];

  if (!fallbackTier) {
    throw new Error('Reputation settings phải có ít nhất một cấp Danh vọng.');
  }

  let tier = fallbackTier;

  for (const candidate of settings.tiers) {
    if (safePoints < candidate.minPoints) break;
    tier = candidate;
  }

  return tier;
}

export function getReputationTierIndex(
  tierId: ReputationTierId,
  settings: ReputationSettings,
): number {
  const index = settings.tiers.findIndex((tier) => tier.id === tierId);
  return index >= 0 ? index : 0;
}

export function getReputationView(
  user: Pick<User | PublicUserProfile, 'reputation'>,
  settings: ReputationSettings,
): ReputationView {
  const totalPoints = Math.max(
    0,
    Math.round(Number(user.reputation?.totalPoints) || 0),
  );
  const tier = getReputationTierByPoints(totalPoints, settings);
  const tierIndex = getReputationTierIndex(tier.id, settings);

  return {
    totalPoints,
    status: user.reputation?.status ?? 'ACTIVE',
    tier,
    tierIndex,
    isHighestTier: tierIndex === settings.tiers.length - 1,
  };
}
