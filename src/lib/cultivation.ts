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
  version: 1,
  earlyPhasePercent: 33.3333,
  middlePhasePercent: 66.6667,
  realms: [
    { id: 'LUYEN_KHI', name: 'Luyện Khí', requiredXp: 4050, className: 'realm-luyen-khi' },
    { id: 'TRUC_CO', name: 'Trúc Cơ', requiredXp: 8100, className: 'realm-truc-co' },
    { id: 'KET_TINH', name: 'Kết Tinh', requiredXp: 15000, className: 'realm-ket-tinh' },
    { id: 'KIM_DAN', name: 'Kim Đan', requiredXp: 30000, className: 'realm-kim-dan' },
    { id: 'CU_LINH', name: 'Cụ Linh', requiredXp: 60000, className: 'realm-cu-linh' },
    { id: 'NGUYEN_ANH', name: 'Nguyên Anh', requiredXp: 120000, className: 'realm-nguyen-anh' },
    { id: 'HOA_THAN', name: 'Hóa Thần', requiredXp: 250000, className: 'realm-hoa-than' },
    { id: 'NGO_DAO', name: 'Ngộ Đạo', requiredXp: 500000, className: 'realm-ngo-dao' },
    { id: 'VU_HOA', name: 'Vũ Hóa', requiredXp: 1000000, className: 'realm-vu-hoa' },
    { id: 'DANG_TIEN', name: 'Đăng Tiên', requiredXp: 2000000, className: 'realm-dang-tien' },
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

  const early = clampNumber(Number(current.earlyPhasePercent) || 33.3333, 1, 98);
  const middle = clampNumber(Number(current.middlePhasePercent) || 66.6667, early + 1, 99);

  const byId = new Map(current.realms?.map((item) => [item.id, item]) ?? []);

  return {
    version: 1,
    earlyPhasePercent: early,
    middlePhasePercent: middle,
    realms: DEFAULT_CULTIVATION_SETTINGS.realms.map((fallback) => {
      const configured = byId.get(fallback.id);
      return {
        ...fallback,
        requiredXp: Math.max(1, Math.round(Number(configured?.requiredXp) || fallback.requiredXp)),
      };
    }),
    updatedAt: current.updatedAt || new Date().toISOString(),
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

export function calculateLegacyCultivationXp(stats: AuthorStats): number {
  const ratingBonus =
    stats.totalReviews > 0
      ? Math.round(stats.averageRating * stats.totalReviews * 18)
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
  const realm = settings.realms.find((item) => item.id === progress?.realmId) ?? settings.realms[0];

  return {
    realmId: realm.id,
    realmXp: clampNumber(Math.round(Number(progress?.realmXp) || 0), 0, realm.requiredXp),
    breakthroughStatus: progress?.breakthroughStatus ?? 'CULTIVATING',
    completedQuestIds: Array.isArray(progress?.completedQuestIds)
      ? progress.completedQuestIds.filter((item): item is string => typeof item === 'string')
      : [],
    updatedAt: progress?.updatedAt ?? new Date().toISOString(),
  };
}

export function getCultivationView(
  user: User | PublicUserProfile,
  stats: AuthorStats,
  settings: CultivationSettings,
): CultivationView {
  const stored = user.cultivation;
  const normalized = normalizeCultivationProgress(stored, settings);
  const realm = settings.realms.find((item) => item.id === normalized.realmId) ?? settings.realms[0];
  const legacyXp = Math.min(calculateLegacyCultivationXp(stats), realm.requiredXp);
  const realmXp = stored ? normalized.realmXp : legacyXp;
  const requiredXp = realm.requiredXp;
  const earlyEnd = Math.round(requiredXp * (settings.earlyPhasePercent / 100));
  const middleEnd = Math.round(requiredXp * (settings.middlePhasePercent / 100));

  let phase: CultivationPhaseId = 'SO_KY';
  let phaseName = 'Sơ kỳ';
  let phaseStartXp = 0;
  let phaseEndXp = earlyEnd;

  if (realmXp >= middleEnd) {
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

  const overallProgress = clampNumber(
    Math.round((realmXp / Math.max(1, requiredXp)) * 100),
    0,
    100,
  );
  const phaseProgress = clampNumber(
    Math.round(
      ((realmXp - phaseStartXp) / Math.max(1, phaseEndXp - phaseStartXp)) * 100,
    ),
    0,
    100,
  );

  return {
    realm,
    phase,
    phaseName,
    realmXp,
    requiredXp,
    overallProgress,
    phaseProgress,
    phaseStartXp,
    phaseEndXp,
    isLateStage: phase === 'HAU_KY',
    isRealmComplete: realmXp >= requiredXp,
    isLegacyPreview: !stored,
  };
}
