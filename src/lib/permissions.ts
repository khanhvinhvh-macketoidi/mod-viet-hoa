import type { ModItem, User } from '@/lib/types';

export const CREATOR_ROLES = ['MODDER', 'ADMIN'] as const;

export function isAdmin(user: User | null | undefined): boolean {
  return user?.role === 'ADMIN';
}

export function isCreator(user: User | null | undefined): boolean {
  return Boolean(user && CREATOR_ROLES.includes(user.role as 'MODDER' | 'ADMIN'));
}

export function canUploadMods(user: User | null | undefined): boolean {
  return isCreator(user);
}

export function ownsMod(user: User | null | undefined, mod: ModItem | null | undefined): boolean {
  return Boolean(user && mod?.authorId && mod.authorId === user.id);
}

export function canManageMod(user: User | null | undefined, mod: ModItem | null | undefined): boolean {
  return isAdmin(user) || ownsMod(user, mod);
}
