import fs from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

export interface FollowItem {
  id: string;
  followerId: string;
  followingId: string;
  createdAt: string;
}

const followsPath = path.join(
  process.cwd(),
  'data',
  'follows.json',
);

async function ensureFollowsFile(): Promise<void> {
  await fs.mkdir(path.dirname(followsPath), {
    recursive: true,
  });

  try {
    await fs.access(followsPath);
  } catch {
    await fs.writeFile(
      followsPath,
      JSON.stringify([], null, 2),
      'utf8',
    );
  }
}

export async function getFollows(): Promise<FollowItem[]> {
  await ensureFollowsFile();

  const content = await fs.readFile(
    followsPath,
    'utf8',
  );

  if (!content.trim()) {
    return [];
  }

  return JSON.parse(content) as FollowItem[];
}

export async function saveFollows(
  follows: FollowItem[],
): Promise<void> {
  await fs.mkdir(path.dirname(followsPath), {
    recursive: true,
  });

  await fs.writeFile(
    followsPath,
    JSON.stringify(follows, null, 2),
    'utf8',
  );
}

export async function isFollowing(
  followerId: string,
  followingId: string,
): Promise<boolean> {
  const follows = await getFollows();

  return follows.some(
    (follow) =>
      follow.followerId === followerId &&
      follow.followingId === followingId,
  );
}

export async function followUser(
  followerId: string,
  followingId: string,
): Promise<FollowItem> {
  if (followerId === followingId) {
    throw new Error(
      'Đạo hữu không thể tự theo dõi chính mình.',
    );
  }

  const follows = await getFollows();

  const existing = follows.find(
    (follow) =>
      follow.followerId === followerId &&
      follow.followingId === followingId,
  );

  if (existing) {
    return existing;
  }

  const follow: FollowItem = {
    id: randomUUID(),
    followerId,
    followingId,
    createdAt: new Date().toISOString(),
  };

  follows.push(follow);
  await saveFollows(follows);

  return follow;
}

export async function unfollowUser(
  followerId: string,
  followingId: string,
): Promise<boolean> {
  const follows = await getFollows();

  const nextFollows = follows.filter(
    (follow) =>
      !(
        follow.followerId === followerId &&
        follow.followingId === followingId
      ),
  );

  if (nextFollows.length === follows.length) {
    return false;
  }

  await saveFollows(nextFollows);
  return true;
}

export async function getFollowerCount(
  userId: string,
): Promise<number> {
  const follows = await getFollows();

  return follows.filter(
    (follow) => follow.followingId === userId,
  ).length;
}

export async function getFollowingCount(
  userId: string,
): Promise<number> {
  const follows = await getFollows();

  return follows.filter(
    (follow) => follow.followerId === userId,
  ).length;
}

export async function getFollowerIds(
  userId: string,
): Promise<string[]> {
  const follows = await getFollows();

  return follows
    .filter(
      (follow) => follow.followingId === userId,
    )
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() -
        new Date(a.createdAt).getTime(),
    )
    .map((follow) => follow.followerId);
}

export async function getFollowingIds(
  userId: string,
): Promise<string[]> {
  const follows = await getFollows();

  return follows
    .filter(
      (follow) => follow.followerId === userId,
    )
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() -
        new Date(a.createdAt).getTime(),
    )
    .map((follow) => follow.followingId);
}
