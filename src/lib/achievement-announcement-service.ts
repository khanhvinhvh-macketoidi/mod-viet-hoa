import 'server-only';

import {
  IDENTITY_TIER_CLASS_NAMES,
  IDENTITY_TIER_LABELS,
  IDENTITY_TIER_ORDER,
  type CultivationPromotionPayload,
  type ReputationPromotionPayload,
} from './achievement-announcements';
import { createAchievementAnnouncement } from './achievement-announcement-repository';
import type { AvatarFrameTier } from './types';
import { getAvatarRankConfig, type AvatarRankTier } from './author-center/avatar-ranks';

function toAvatarRankTier(tier: AvatarFrameTier): AvatarRankTier {
  return tier === 'MEMBER' ? 'PHAM_NHAN' : tier;
}

export async function announceCultivationPromotion(
  input: CultivationPromotionPayload,
): Promise<void> {
  await createAchievementAnnouncement({
    userId: input.userId,
    type: 'CULTIVATION_REALM_PROMOTED',
    uniqueKey: `CULTIVATION_REALM_PROMOTED:${input.userId}:${input.current.realmId}:${input.triggerId}`,
    previous: {
      id: input.previous.realmId,
      name: input.previous.realmName,
      subtitle: input.previous.phaseName,
      className: input.previous.className,
    },
    current: {
      id: input.current.realmId,
      name: input.current.realmName,
      subtitle: input.current.phaseName,
      className: input.current.className,
    },
    metadata: { triggerId: input.triggerId },
  });
}

export async function announceCultivationDemotion(
  input: CultivationPromotionPayload,
): Promise<void> {
  await createAchievementAnnouncement({
    userId: input.userId,
    type: 'CULTIVATION_REALM_DEMOTED',
    uniqueKey: `CULTIVATION_REALM_DEMOTED:${input.userId}:${input.previous.realmId}:${input.current.realmId}:${input.triggerId}`,
    previous: {
      id: input.previous.realmId,
      name: input.previous.realmName,
      subtitle: input.previous.phaseName,
      className: input.previous.className,
    },
    current: {
      id: input.current.realmId,
      name: input.current.realmName,
      subtitle: input.current.phaseName,
      className: input.current.className,
    },
    metadata: { triggerId: input.triggerId },
  });
}

export async function announceReputationPromotion(
  input: ReputationPromotionPayload,
): Promise<void> {
  await createAchievementAnnouncement({
    userId: input.userId,
    type: 'REPUTATION_TIER_PROMOTED',
    uniqueKey: `REPUTATION_TIER_PROMOTED:${input.userId}:${input.current.id}:${input.triggerId}`,
    previous: {
      id: input.previous.id,
      name: input.previous.name,
      color: input.previous.color,
      className: input.previous.className,
    },
    current: {
      id: input.current.id,
      name: input.current.name,
      color: input.current.color,
      className: input.current.className,
    },
    metadata: { triggerId: input.triggerId },
  });
}

export async function announceReputationDemotion(
  input: ReputationPromotionPayload,
): Promise<void> {
  await createAchievementAnnouncement({
    userId: input.userId,
    type: 'REPUTATION_TIER_DEMOTED',
    uniqueKey: `REPUTATION_TIER_DEMOTED:${input.userId}:${input.previous.id}:${input.current.id}:${input.triggerId}`,
    previous: {
      id: input.previous.id,
      name: input.previous.name,
      color: input.previous.color,
      className: input.previous.className,
    },
    current: {
      id: input.current.id,
      name: input.current.name,
      color: input.current.color,
      className: input.current.className,
    },
    metadata: { triggerId: input.triggerId },
  });
}

export async function announceIdentityPromotion(input: {
  userId: string;
  previousTier: AvatarFrameTier;
  currentTier: AvatarFrameTier;
  triggerId: string;
}): Promise<void> {
  const previousIndex = IDENTITY_TIER_ORDER.indexOf(input.previousTier);
  const currentIndex = IDENTITY_TIER_ORDER.indexOf(input.currentTier);

  if (currentIndex <= previousIndex) return;

  const previousConfig = getAvatarRankConfig(
    toAvatarRankTier(input.previousTier),
  );
  const currentConfig = getAvatarRankConfig(
    toAvatarRankTier(input.currentTier),
  );

  await createAchievementAnnouncement({
    userId: input.userId,
    type: 'IDENTITY_TIER_PROMOTED',
    uniqueKey: `IDENTITY_TIER_PROMOTED:${input.userId}:${input.currentTier}:${input.triggerId}`,
    previous: {
      id: input.previousTier,
      name: IDENTITY_TIER_LABELS[input.previousTier],
      className: IDENTITY_TIER_CLASS_NAMES[input.previousTier],
      assetUrl: previousConfig.badge.asset.src,
    },
    current: {
      id: input.currentTier,
      name: IDENTITY_TIER_LABELS[input.currentTier],
      className: IDENTITY_TIER_CLASS_NAMES[input.currentTier],
      assetUrl: currentConfig.badge.asset.src,
    },
    metadata: { triggerId: input.triggerId },
  });
}
