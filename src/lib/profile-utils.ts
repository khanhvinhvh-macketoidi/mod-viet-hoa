import type { ReputationProgress, User, UserProfile } from './types';

export const DEFAULT_AVATAR_URL = '/images/default-avatar.png';

export function createProfileSlug(value: string): string {
  const slug = value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return slug || 'user';
}

export function normalizeComparableText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLocaleLowerCase('vi')
    .replace(/\s+/g, ' ')
    .trim();
}

export function normalizeProfile(user: User): UserProfile {
  const profile = user.profile;

  return {
    displayName: profile?.displayName?.trim() || user.name,
    avatar: profile?.avatar?.trim() || DEFAULT_AVATAR_URL,
    coverImage: profile?.coverImage?.trim() || undefined,
    coverPosition: {
      x: profile?.coverPosition?.x ?? 50,
      y: profile?.coverPosition?.y ?? 50,
    },
    bio: profile?.bio ?? '',
    location: profile?.location ?? '',
    website: profile?.website ?? '',
    socialLinks: {
      ...(profile?.socialLinks ?? {}),
    },
  };
}

export function normalizeReputation(user: User): ReputationProgress {
  const totalPoints = Math.max(
    0,
    Math.round(Number(user.reputation?.totalPoints) || 0),
  );

  return {
    totalPoints,
    tierId: user.reputation?.tierId ?? 'KHONG_CHUT_TIENG_TAM',
    status: user.reputation?.status ?? 'ACTIVE',
    updatedAt: user.reputation?.updatedAt ?? user.updatedAt ?? user.createdAt,
  };
}

export function normalizeUser(user: User, profileSlug?: string): User {
  return {
    ...user,
    profileSlug:
      profileSlug || user.profileSlug?.trim() || createProfileSlug(user.name),
    profile: normalizeProfile(user),
    reputation: normalizeReputation(user),
    updatedAt: user.updatedAt ?? user.createdAt,
    isActive: user.isActive ?? true,
  };
}

export function normalizeUsers(users: User[]): User[] {
  const usedSlugs = new Set<string>();

  return users.map((user) => {
    const baseSlug = createProfileSlug(
      user.profileSlug?.trim() || user.profile?.displayName || user.name,
    );

    let uniqueSlug = baseSlug;
    let suffix = 2;

    while (usedSlugs.has(uniqueSlug)) {
      uniqueSlug = `${baseSlug}-${suffix}`;
      suffix += 1;
    }

    usedSlugs.add(uniqueSlug);
    return normalizeUser(user, uniqueSlug);
  });
}
