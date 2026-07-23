import type { CommentItem } from './types';
import { commentsPath } from './data-paths';
import { readJson, writeJson } from './json-store';

export async function getComments(): Promise<CommentItem[]> {
  return readJson<CommentItem[]>(commentsPath, []);
}

export async function saveComments(comments: CommentItem[]): Promise<void> {
  await writeJson(commentsPath, comments);
}

export async function getCommentsByModId(
  modId: string,
): Promise<CommentItem[]> {
  return (await getComments())
    .filter((comment) => comment.modId === modId)
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
}

export async function getCommentById(
  id: string,
): Promise<CommentItem | undefined> {
  return (await getComments()).find((comment) => comment.id === id);
}

export async function getCommentCountMap(): Promise<Record<string, number>> {
  const countMap: Record<string, number> = {};

  for (const comment of await getComments()) {
    countMap[comment.modId] = (countMap[comment.modId] ?? 0) + 1;
  }

  return countMap;
}
