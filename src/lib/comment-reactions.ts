import fs from 'node:fs/promises';
import path from 'node:path';

export interface CommentReaction {
  commentId: string;
  userId: string;
  type: 'LIKE';
  createdAt: string;
}

const reactionsPath = path.join(
  process.cwd(),
  'data',
  'comment-reactions.json',
);

async function ensureFile(): Promise<void> {
  await fs.mkdir(path.dirname(reactionsPath), {
    recursive: true,
  });

  try {
    await fs.access(reactionsPath);
  } catch {
    await fs.writeFile(
      reactionsPath,
      JSON.stringify([], null, 2),
      'utf8',
    );
  }
}

export async function getCommentReactions(): Promise<
  CommentReaction[]
> {
  await ensureFile();

  const content = await fs.readFile(
    reactionsPath,
    'utf8',
  );

  if (!content.trim()) return [];

  return JSON.parse(content) as CommentReaction[];
}

export async function saveCommentReactions(
  reactions: CommentReaction[],
): Promise<void> {
  await ensureFile();

  await fs.writeFile(
    reactionsPath,
    JSON.stringify(reactions, null, 2),
    'utf8',
  );
}

export async function toggleCommentLike(
  commentId: string,
  userId: string,
): Promise<{ liked: boolean; count: number }> {
  const reactions = await getCommentReactions();

  const index = reactions.findIndex(
    (item) =>
      item.commentId === commentId &&
      item.userId === userId &&
      item.type === 'LIKE',
  );

  let liked = false;

  if (index >= 0) {
    reactions.splice(index, 1);
  } else {
    reactions.push({
      commentId,
      userId,
      type: 'LIKE',
      createdAt: new Date().toISOString(),
    });

    liked = true;
  }

  await saveCommentReactions(reactions);

  const count = reactions.filter(
    (item) =>
      item.commentId === commentId &&
      item.type === 'LIKE',
  ).length;

  return { liked, count };
}

export async function getReactionSummaryMap(
  commentIds: string[],
  currentUserId?: string,
): Promise<
  Record<string, { count: number; likedByCurrentUser: boolean }>
> {
  const ids = new Set(commentIds);
  const reactions = await getCommentReactions();

  const result: Record<
    string,
    { count: number; likedByCurrentUser: boolean }
  > = {};

  for (const id of commentIds) {
    result[id] = {
      count: 0,
      likedByCurrentUser: false,
    };
  }

  for (const reaction of reactions) {
    if (!ids.has(reaction.commentId)) continue;

    const summary = result[reaction.commentId];

    summary.count += 1;

    if (
      currentUserId &&
      reaction.userId === currentUserId
    ) {
      summary.likedByCurrentUser = true;
    }
  }

  return result;
}
