import fs from 'node:fs/promises';
import path from 'node:path';
import type { ModItem, User } from './types';
import {
  backupsDir,
  modsPath,
  usersPath,
} from './data-paths';
import {
  copyFileSafe,
  ensureJsonFile,
  readJson,
  writeJson,
} from './json-store';
import {
  normalizeComparableText,
  normalizeUsers,
} from './profile-utils';

export type MigrationBackup = {
  directory: string;
  usersFile: string;
  modsFile: string;
};

export type MigrationModIssue = {
  modId: string;
  modTitle: string;
  author: string;
  candidateUserIds?: string[];
};

export type UserProfileMigrationResult = {
  executedAt: string;
  backup: MigrationBackup;
  usersTotal: number;
  usersUpdated: number;
  modsTotal: number;
  modsLinked: number;
  modsAlreadyLinked: number;
  unmatchedMods: MigrationModIssue[];
  ambiguousMods: MigrationModIssue[];
};

function makeBackupFolderName(date: Date): string {
  return `user-profile-migration-${date
    .toISOString()
    .replace(/[:.]/g, '-')}`;
}

async function createMigrationBackup(): Promise<MigrationBackup> {
  await ensureJsonFile(usersPath, []);
  await ensureJsonFile(modsPath, []);

  const directory = path.join(
    backupsDir,
    makeBackupFolderName(new Date()),
  );
  const usersFile = path.join(directory, 'users.json');
  const modsFile = path.join(directory, 'mods.json');

  await fs.mkdir(directory, { recursive: true });
  await Promise.all([
    copyFileSafe(usersPath, usersFile),
    copyFileSafe(modsPath, modsFile),
  ]);

  return { directory, usersFile, modsFile };
}

function countChangedUsers(before: User[], after: User[]): number {
  return after.reduce((count, user, index) => {
    return JSON.stringify(before[index]) === JSON.stringify(user)
      ? count
      : count + 1;
  }, 0);
}

function buildUserCandidateMap(users: User[]): Map<string, User[]> {
  const candidateMap = new Map<string, User[]>();

  for (const user of users) {
    const keys = new Set([
      normalizeComparableText(user.name),
      normalizeComparableText(user.profile?.displayName || ''),
      normalizeComparableText(user.profileSlug || ''),
    ]);

    for (const key of keys) {
      if (!key) continue;
      const candidates = candidateMap.get(key) ?? [];
      candidates.push(user);
      candidateMap.set(key, candidates);
    }
  }

  return candidateMap;
}

function linkModAuthors(
  mods: ModItem[],
  users: User[],
): {
  mods: ModItem[];
  linked: number;
  alreadyLinked: number;
  unmatched: MigrationModIssue[];
  ambiguous: MigrationModIssue[];
} {
  const userIds = new Set(users.map((user) => user.id));
  const candidateMap = buildUserCandidateMap(users);
  const unmatched: MigrationModIssue[] = [];
  const ambiguous: MigrationModIssue[] = [];
  let linked = 0;
  let alreadyLinked = 0;

  const migratedMods = mods.map((mod) => {
    if (mod.authorId && userIds.has(mod.authorId)) {
      alreadyLinked += 1;
      return mod;
    }

    const authorKey = normalizeComparableText(mod.author);
    const candidates = candidateMap.get(authorKey) ?? [];
    const uniqueCandidates = Array.from(
      new Map(candidates.map((user) => [user.id, user])).values(),
    );

    if (uniqueCandidates.length === 1) {
      linked += 1;
      return {
        ...mod,
        authorId: uniqueCandidates[0].id,
      };
    }

    const issue: MigrationModIssue = {
      modId: mod.id,
      modTitle: mod.title,
      author: mod.author,
    };

    if (uniqueCandidates.length > 1) {
      ambiguous.push({
        ...issue,
        candidateUserIds: uniqueCandidates.map((user) => user.id),
      });
    } else {
      unmatched.push(issue);
    }

    return mod;
  });

  return {
    mods: migratedMods,
    linked,
    alreadyLinked,
    unmatched,
    ambiguous,
  };
}

export async function migrateUsers(): Promise<UserProfileMigrationResult> {
  const backup = await createMigrationBackup();
  const rawUsers = await readJson<User[]>(usersPath, []);
  const rawMods = await readJson<ModItem[]>(modsPath, []);
  const normalizedUsers = normalizeUsers(rawUsers);
  const linkedMods = linkModAuthors(rawMods, normalizedUsers);

  try {
    await writeJson(usersPath, normalizedUsers);
    await writeJson(modsPath, linkedMods.mods);
  } catch (error) {
    await restoreMigrationBackup(backup);
    throw new Error(
      `Chuyển đổi thất bại và dữ liệu đã được khôi phục: ${
        error instanceof Error ? error.message : 'Lỗi không xác định'
      }`,
    );
  }

  return {
    executedAt: new Date().toISOString(),
    backup,
    usersTotal: rawUsers.length,
    usersUpdated: countChangedUsers(rawUsers, normalizedUsers),
    modsTotal: rawMods.length,
    modsLinked: linkedMods.linked,
    modsAlreadyLinked: linkedMods.alreadyLinked,
    unmatchedMods: linkedMods.unmatched,
    ambiguousMods: linkedMods.ambiguous,
  };
}

export async function restoreMigrationBackup(
  backup: MigrationBackup,
): Promise<void> {
  await Promise.all([
    copyFileSafe(backup.usersFile, usersPath),
    copyFileSafe(backup.modsFile, modsPath),
  ]);
}