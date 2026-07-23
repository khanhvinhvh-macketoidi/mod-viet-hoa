import type { CommentItem } from './types';

export type CommentTreeNode = CommentItem & {
  children: CommentTreeNode[];
  depth: number;
};

export function buildCommentTree(
  comments: CommentItem[],
): CommentTreeNode[] {
  const nodes = new Map<string, CommentTreeNode>();

  for (const comment of comments) {
    nodes.set(comment.id, {
      ...comment,
      children: [],
      depth: 0,
    });
  }

  const roots: CommentTreeNode[] = [];

  for (const node of nodes.values()) {
    if (!node.parentId) {
      roots.push(node);
      continue;
    }

    const parent = nodes.get(node.parentId);

    if (!parent || parent.id === node.id) {
      roots.push(node);
      continue;
    }

    parent.children.push(node);
  }

  function assignDepth(node: CommentTreeNode, depth: number) {
    node.depth = depth;

    node.children.sort(
      (a, b) =>
        new Date(a.createdAt).getTime() -
        new Date(b.createdAt).getTime(),
    );

    for (const child of node.children) {
      assignDepth(child, depth + 1);
    }
  }

  roots.sort(
    (a, b) =>
      new Date(b.createdAt).getTime() -
      new Date(a.createdAt).getTime(),
  );

  for (const root of roots) {
    assignDepth(root, 0);
  }

  return roots;
}

export function collectDescendantIds(
  comments: CommentItem[],
  rootId: string,
): Set<string> {
  const childrenByParent = new Map<string, string[]>();

  for (const comment of comments) {
    if (!comment.parentId) continue;

    const current =
      childrenByParent.get(comment.parentId) ?? [];

    current.push(comment.id);
    childrenByParent.set(comment.parentId, current);
  }

  const result = new Set<string>();
  const queue = [...(childrenByParent.get(rootId) ?? [])];

  while (queue.length > 0) {
    const id = queue.shift();

    if (!id || result.has(id)) continue;

    result.add(id);
    queue.push(...(childrenByParent.get(id) ?? []));
  }

  return result;
}

export function isCommentEffectivelyLocked(
  comments: CommentItem[],
  comment: CommentItem,
): boolean {
  if (comment.isLocked) return true;

  const byId = new Map(
    comments.map((item) => [item.id, item]),
  );

  let current = comment;
  const visited = new Set<string>();

  while (current.parentId) {
    if (visited.has(current.parentId)) {
      return true;
    }

    visited.add(current.parentId);

    const parent = byId.get(current.parentId);

    if (!parent) return false;
    if (parent.isLocked) return true;

    current = parent;
  }

  return false;
}
