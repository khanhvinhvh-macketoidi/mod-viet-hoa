import type { PublicUserProfile, User } from './types';
import { usersPath } from './data-paths';
import { readJson, writeJson } from './json-store';
import {
  DEFAULT_AVATAR_URL,
  createProfileSlug,
  normalizeComparableText,
  normalizeUser,
  normalizeUsers,
} from './profile-utils';

export async function getUsers(): Promise<User[]> {
  const users = await readJson<User[]>(usersPath, []);
  return normalizeUsers(users);
}

export async function getRawUsers(): Promise<User[]> {
  return readJson<User[]>(usersPath, []);
}

export async function saveUsers(users: User[]): Promise<void> {
  await writeJson(usersPath, normalizeUsers(users));
}

export async function getUserById(id: string): Promise<User | undefined> {
  return (await getUsers()).find((user) => user.id === id);
}

export async function getUserByName(name: string): Promise<User | undefined> {
  const target = normalizeComparableText(name);

  return (await getUsers()).find(
    (user) => normalizeComparableText(user.name) === target,
  );
}

export async function getUserByEmail(email: string): Promise<User | undefined> {
  const target = email.trim().toLowerCase();

  return (await getUsers()).find(
    (user) => user.email.trim().toLowerCase() === target,
  );
}

export async function getUserByProfileSlug(
  slug: string,
): Promise<User | undefined> {
  const target = createProfileSlug(slug);

  return (await getUsers()).find((user) => user.profileSlug === target);
}

export function sanitizeUserDisplayName(
  value: string | null | undefined,
): string {
  return (value ?? '')
    .normalize('NFKC')
    // Game/BBCode formatting tags: [B], [/B], [C], [FF0000], [#FF0000]...
    .replace(/\[(?:\/?[a-z][a-z0-9_-]*|#?[0-9a-f]{6,8})\]/gi, '')
    // Decorative block glyphs left by in-game color-name formats.
    .replace(/[░▒▓█▤▥▦▧▨▩▰▱■□]+/g, ' ')
    .replace(/\[\s*\]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function getUserDisplayName(user: Pick<User, 'name' | 'profile'>): string {
  return (
    sanitizeUserDisplayName(user.profile?.displayName) ||
    sanitizeUserDisplayName(user.name) ||
    'Người dùng'
  );
}

export function getUserAvatar(user: Pick<User, 'profile'>): string {
  return user.profile?.avatar?.trim() || DEFAULT_AVATAR_URL;
}

export function toPublicUserProfile(user: User): PublicUserProfile {
  const normalized = normalizeUser(user);

  return {
    id: normalized.id,
    name: normalized.name,
    profileSlug: normalized.profileSlug!,
    role: normalized.role,
    isVip: normalized.isVip,
    avatarFrameTier: normalized.avatarFrameTier,
    profile: normalized.profile!,
    createdAt: normalized.createdAt,
  };
}

export async function getPublicUserByProfileSlug(
  slug: string,
): Promise<PublicUserProfile | undefined> {
  const user = await getUserByProfileSlug(slug);
  return user ? toPublicUserProfile(user) : undefined;
}
