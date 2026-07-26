import type {
  AvatarFrameTier,
  CultivationRealmId,
  ReputationTierId,
} from './types';

export type AchievementAnnouncementType =
  | 'CULTIVATION_REALM_PROMOTED'
  | 'CULTIVATION_REALM_DEMOTED'
  | 'REPUTATION_TIER_PROMOTED'
  | 'REPUTATION_TIER_DEMOTED'
  | 'IDENTITY_TIER_PROMOTED';

export type AchievementAnnouncementSnapshot = {
  id: string;
  name: string;
  subtitle?: string;
  color?: string;
  className?: string;
  assetUrl?: string;
};

export type AchievementAnnouncement = {
  id: string;
  userId: string;
  type: AchievementAnnouncementType;
  uniqueKey: string;
  createdAt: string;
  seenAt?: string;
  previous?: AchievementAnnouncementSnapshot;
  current: AchievementAnnouncementSnapshot;
  metadata?: Record<string, string | number | boolean | null>;
};

export const ACHIEVEMENT_ANNOUNCEMENT_PRIORITY: Record<
  AchievementAnnouncementType,
  number
> = {
  CULTIVATION_REALM_PROMOTED: 0,
  CULTIVATION_REALM_DEMOTED: 0,
  REPUTATION_TIER_PROMOTED: 1,
  REPUTATION_TIER_DEMOTED: 1,
  IDENTITY_TIER_PROMOTED: 2,
};

export function compareAchievementAnnouncements(
  left: AchievementAnnouncement,
  right: AchievementAnnouncement,
): number {
  return (
    ACHIEVEMENT_ANNOUNCEMENT_PRIORITY[left.type] -
      ACHIEVEMENT_ANNOUNCEMENT_PRIORITY[right.type] ||
    left.createdAt.localeCompare(right.createdAt) ||
    left.id.localeCompare(right.id)
  );
}

export const IDENTITY_TIER_ORDER: AvatarFrameTier[] = [
  'MEMBER',
  'NHAN_KIET',
  'THIEN_KIEU',
  'THAN_THOAI',
];

export const IDENTITY_TIER_LABELS: Record<AvatarFrameTier, string> = {
  MEMBER: 'Phàm Nhân',
  NHAN_KIET: 'Nhân Kiệt',
  THIEN_KIEU: 'Thiên Kiêu',
  THAN_THOAI: 'Thần Thoại',
};

export const IDENTITY_TIER_CLASS_NAMES: Record<AvatarFrameTier, string> = {
  MEMBER: 'identity-member',
  NHAN_KIET: 'identity-nhan-kiet',
  THIEN_KIEU: 'identity-thien-kieu',
  THAN_THOAI: 'identity-than-thoai',
};

export type CultivationPromotionPayload = {
  userId: string;
  triggerId: string;
  previous: {
    realmId: CultivationRealmId;
    realmName: string;
    phaseName: string;
    className: string;
  };
  current: {
    realmId: CultivationRealmId;
    realmName: string;
    phaseName: string;
    className: string;
  };
};

export type ReputationPromotionPayload = {
  userId: string;
  triggerId: string;
  previous: {
    id: ReputationTierId;
    name: string;
    color: string;
    className: string;
  };
  current: {
    id: ReputationTierId;
    name: string;
    color: string;
    className: string;
  };
};
