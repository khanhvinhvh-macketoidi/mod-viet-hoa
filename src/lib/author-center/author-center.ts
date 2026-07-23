import 'server-only';

export type AvatarFrameTier =
  | 'MEMBER'
  | 'NHAN_KIET'
  | 'THIEN_KIEU'
  | 'THAN_THOAI';

export type CultivationPhase = 'SO_KY' | 'TRUNG_KY' | 'HAU_KY';

export type RealmId =
  | 'LUYEN_KHI'
  | 'TRUC_CO'
  | 'KET_TINH'
  | 'KIM_DAN'
  | 'CU_LINH'
  | 'NGUYEN_ANH'
  | 'HOA_THAN'
  | 'NGO_DAO'
  | 'VU_HOA'
  | 'DANG_TIEN';

export type AuthorCenterUser = {
  id: string;
  name: string;
  role: 'MEMBER' | 'MODDER' | 'ADMIN';
  isVip: boolean;
  createdAt: string;
  profileSlug?: string;
  avatarFrameTier?: AvatarFrameTier;
  profile?: {
    displayName?: string;
    avatar?: string;
    coverImage?: string;
    coverPosition?: { x?: number; y?: number };
    bio?: string;
    location?: string;
    website?: string;
    socialLinks?: {
      facebook?: string;
      youtube?: string;
      discord?: string;
      github?: string;
      steam?: string;
    };
  };
};

export type AuthorCenterStats = {
  publishedModCount: number;
  totalDownloads: number;
  totalReviews: number;
  totalComments: number;
  averageRating: number;
};

export type CultivationRealm = {
  id: RealmId;
  name: string;
  phase: CultivationPhase;
  phaseName: string;
  stageIndex: number;
  totalStages: number;
  currentXp: number;
  stageStartXp: number;
  stageEndXp: number;
  progress: number;
  className: string;
  isLateStage: boolean;
};

const REALMS: Array<{ id: RealmId; name: string; className: string }> = [
  { id: 'LUYEN_KHI', name: 'Luyện Khí', className: 'realm-luyen-khi' },
  { id: 'TRUC_CO', name: 'Trúc Cơ', className: 'realm-truc-co' },
  { id: 'KET_TINH', name: 'Kết Tinh', className: 'realm-ket-tinh' },
  { id: 'KIM_DAN', name: 'Kim Đan', className: 'realm-kim-dan' },
  { id: 'CU_LINH', name: 'Cụ Linh', className: 'realm-cu-linh' },
  { id: 'NGUYEN_ANH', name: 'Nguyên Anh', className: 'realm-nguyen-anh' },
  { id: 'HOA_THAN', name: 'Hóa Thần', className: 'realm-hoa-than' },
  { id: 'NGO_DAO', name: 'Ngộ Đạo', className: 'realm-ngo-dao' },
  { id: 'VU_HOA', name: 'Vũ Hóa', className: 'realm-vu-hoa' },
  { id: 'DANG_TIEN', name: 'Đăng Tiên', className: 'realm-dang-tien' },
];

const PHASES: Array<{ id: CultivationPhase; name: string }> = [
  { id: 'SO_KY', name: 'Sơ kỳ' },
  { id: 'TRUNG_KY', name: 'Trung kỳ' },
  { id: 'HAU_KY', name: 'Hậu kỳ' },
];

export const AVATAR_FRAME_OPTIONS: Array<{
  id: AvatarFrameTier;
  name: string;
  description: string;
}> = [
  { id: 'MEMBER', name: 'Phàm Nhân', description: 'Thân phận khởi đầu dành cho mọi đạo hữu.' },
  { id: 'NHAN_KIET', name: 'Nhân Kiệt', description: 'Khung bạc dành cho thành viên sôi nổi hoặc người ủng hộ.' },
  { id: 'THIEN_KIEU', name: 'Thiên Kiêu', description: 'Khung vàng dành cho thành viên cao cấp.' },
  { id: 'THAN_THOAI', name: 'Thần Thoại', description: 'Khung danh dự tối cao, chỉ Admin cấp.' },
];

export function calculateCultivationXp(stats: AuthorCenterStats): number {
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

function stageThreshold(stageIndex: number): number {
  // 30 bậc. Đường cong tăng dần, nhưng không tạo khoảng cách quá lớn
  // ở các cảnh giới đầu để người dùng mới vẫn cảm nhận được tiến bộ.
  return Math.round(250 * stageIndex * stageIndex + 600 * stageIndex);
}

export function getCultivationRealm(
  stats: AuthorCenterStats,
): CultivationRealm {
  const currentXp = calculateCultivationXp(stats);
  const totalStages = REALMS.length * PHASES.length;

  let stageIndex = totalStages - 1;

  for (let index = 0; index < totalStages; index += 1) {
    if (currentXp < stageThreshold(index + 1)) {
      stageIndex = index;
      break;
    }
  }

  const realmIndex = Math.floor(stageIndex / 3);
  const phaseIndex = stageIndex % 3;
  const realm = REALMS[Math.min(realmIndex, REALMS.length - 1)];
  const phase = PHASES[phaseIndex];
  const stageStartXp = stageThreshold(stageIndex);
  const stageEndXp =
    stageIndex >= totalStages - 1
      ? stageThreshold(totalStages)
      : stageThreshold(stageIndex + 1);

  const progress =
    stageIndex >= totalStages - 1 && currentXp >= stageEndXp
      ? 100
      : Math.max(
          0,
          Math.min(
            100,
            Math.round(
              ((currentXp - stageStartXp) /
                Math.max(1, stageEndXp - stageStartXp)) *
                100,
            ),
          ),
        );

  return {
    id: realm.id,
    name: realm.name,
    phase: phase.id,
    phaseName: phase.name,
    stageIndex,
    totalStages,
    currentXp,
    stageStartXp,
    stageEndXp,
    progress,
    className: realm.className,
    isLateStage: phase.id === 'HAU_KY',
  };
}

export function getAvatarFrameTier(
  user: AuthorCenterUser,
): AvatarFrameTier {
  return user.avatarFrameTier ?? 'MEMBER';
}

export function getAvatarFrameName(tier: AvatarFrameTier): string {
  return (
    AVATAR_FRAME_OPTIONS.find((item) => item.id === tier)?.name ??
    'Phàm Nhân'
  );
}

export function formatCompactNumber(value: number): string {
  return new Intl.NumberFormat('vi-VN', {
    notation: value >= 10_000 ? 'compact' : 'standard',
    maximumFractionDigits: 1,
  }).format(value);
}

export function formatJoinDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Không xác định';

  return new Intl.DateTimeFormat('vi-VN', {
    month: 'long',
    year: 'numeric',
  }).format(date);
}

export function sanitizePublicUrl(value?: string): string | null {
  if (!value?.trim()) return null;

  try {
    const url = new URL(value.trim());
    return ['http:', 'https:'].includes(url.protocol) ? url.toString() : null;
  } catch {
    return null;
  }
}
